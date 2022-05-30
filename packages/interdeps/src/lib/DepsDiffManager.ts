import Messager from './Messager';
import type Package from './Package';
import Semver from './Semver';
import type { SemverBlocName } from './Semver';
import { getLogger } from './util';
import type Workspace from './Workspace';

type DepsBlocName = 'dependencies' | 'devDependencies' | 'peerDependencies';

const log = getLogger('DepsDiffManager');

export default class DepsDiffManager {
  public static readonly DEPS_BLOC_NAMES: DepsBlocName[] = [
    'dependencies',
    'peerDependencies',
    'devDependencies',
  ];

  private readonly workspace: Workspace;

  public constructor (workspace: Workspace) {
    this.workspace = workspace;
  }

  public async fixAllPackages (): Promise<void> {
    log('fixAllPackages');
    const packages = await this.workspace.getAllPackages();

    await Promise.all(packages.map(async pkg => { await this.fixPackage(pkg); }));

    await Promise.all(packages.map(async pkg => await Promise.all([
      pkg.index.save(),
      pkg.work.save(),
    ])));
  }

  public async fixPackage (pkg: Package): Promise<void> {
    log('fixPackage', pkg.getName());
    const headVersion = await pkg.head.getVersion();
    const isWorkSync = await pkg.work.get('version') === await pkg.index.get('version');
    const canUpdateWork = isWorkSync;
    let actualIncreaseType = headVersion.increaseType(await pkg.index.getVersion());

    pkg.index.on('need-update', (increaseRequired: SemverBlocName, cause: string) => {
      if (Semver.blocRank(increaseRequired) <= Semver.blocRank(actualIncreaseType)) return;
      actualIncreaseType = increaseRequired;
      const newVersion = headVersion.increase(increaseRequired).toFixedString();
      console.info(`${pkg.getName()}: ${headVersion.toString()} => ${newVersion}\nBecause ${cause}`);
      pkg.index.setVersion(newVersion);
      if (canUpdateWork) pkg.work.setVersion(newVersion);
      pkg.index.emit('version', newVersion);
    });

    await Promise.all(DepsDiffManager.DEPS_BLOC_NAMES.map(
      async bloc => { await this.fixBloc(pkg, bloc); }
    ));
  }

  public async fixBloc (pkg: Package, bloc: DepsBlocName): Promise<void> {
    log('fixBloc', pkg.getName(), bloc);
    const deps = (await pkg.index.get([bloc])) as Record<string, string> | undefined;

    if (!deps) return;

    await Promise.all(Object.entries(deps).map(
      async ([dep, version]) => { await this.fixOneDep(pkg, bloc, dep, version); }
    ));
  }

  public async fixOneDep (
    pkg: Package, bloc: DepsBlocName, dep: string, version: string
  ): Promise<void> {
    log('fixOneDep', pkg.getName(), bloc, dep);
    const pkgHeadDepVersion = await pkg.head.get([bloc, dep]) as string | null;

    // Added dependencies are managed by CodeDiffManager
    if (!pkgHeadDepVersion) return;

    const pkgHeadDepSemver = new Semver(pkgHeadDepVersion);
    let actualIncreaseType = pkgHeadDepSemver.increaseType(version);
    const depPkg = await this.workspace.getPackageByName(dep);
    if (actualIncreaseType) {
      const event = `${pkg.getName()}[${bloc}.${dep}]: ${pkgHeadDepVersion} => ${version}`;
      pkg.index.emit('need-update', depPkg ? actualIncreaseType : 'fix', event);
    }

    if (!depPkg) return;

    const depPkgHeadVersion = await depPkg.head.getVersion();
    const isWorkSync = await pkg.work.get([bloc, dep]) === await pkg.index.get([bloc, dep]);
    const canUpdateWork = isWorkSync;

    // eslint-disable-next-line func-style
    const handleDepPkgVersion = (newVersion: string): void => {
      const increaseType = pkgHeadDepSemver.increaseType(newVersion);
      if (!increaseType) return;
      if (Semver.blocRank(actualIncreaseType) >= Semver.blocRank(increaseType)) return;

      const event = `${pkg.getName()}[${bloc}.${dep}]: ${pkgHeadDepVersion} => ${newVersion}`;
      const cause = `${depPkg.getName()}: ${depPkgHeadVersion.toString()} => ${newVersion}`;

      console.info(`${event}\nBecause ${cause}\n`);
      actualIncreaseType = increaseType;
      pkg.index.set([bloc, dep], newVersion);
      if (canUpdateWork) pkg.work.set([bloc, dep], newVersion);
      pkg.index.emit('need-update', actualIncreaseType, event);
    };

    depPkg.index.on('version', handleDepPkgVersion);
    handleDepPkgVersion((await depPkg.index.getVersion()).toString());
  }

  public async promptAll (): Promise<Messager> {
    log('promptAll');
    const messager = new Messager('Concordance des dépendances');
    const packages = await this.workspace.getAllPackages();

    await Promise.all(packages.map(async pkg => {
      messager.push(await this.promptPackage(pkg));
    }));
    return messager;
  }

  private async promptPackage (pkg: Package): Promise<Messager> {
    log('promptPackage', pkg.getName());
    const messager = new Messager(`dépendances de "${pkg.getName()}"`);
    await Promise.all(DepsDiffManager.DEPS_BLOC_NAMES.map(async bloc => {
      messager.push(await this.promptBloc(pkg, bloc));
    }));
    return messager;
  }

  private async promptBloc (pkg: Package, bloc: DepsBlocName): Promise<Messager> {
    log('promptBloc', pkg.getName(), bloc);
    const messager = new Messager(bloc);
    const deps = (await pkg.getNewValue(bloc)) as Record<string, string> | undefined;

    if (!deps) return messager;
    await Promise.all(Object.entries(deps).map(async ([dep, version]) => {
      messager.push(await this.promptOneDep(pkg, bloc, dep, version));
    }));

    return messager;
  }

  private async promptOneDep (
    pkg: Package, bloc: DepsBlocName, dep: string, version: string
  ): Promise<Messager> {
    log('promptOneDep', pkg.getName(), bloc, dep);
    const messager = new Messager(dep);
    messager.push(await this.promptInconsistentDep(pkg, bloc, dep, version));
    messager.push(await promptBiggerDepUpdate(pkg, bloc, dep, version));
    return messager;
  }

  private async promptInconsistentDep (
    pkg: Package, bloc: DepsBlocName, dep: string, version: string
  ): Promise<Messager> {
    const messager = new Messager('Dépendance non cohérente');
    const depPkg = await this.workspace.getPackageByName(dep);

    if (!depPkg || version === '*') return messager;

    const currentVersion = String(await depPkg.index.get('version'));
    if (currentVersion !== version) {
      messager.push(`version actuelle de ${dep}: ${currentVersion}`);
      messager.push(`version utilisée dans ${pkg.getName()}: ${version}`);
    }
    return messager;
  }
}

async function promptBiggerDepUpdate (
  pkg: Package, bloc: DepsBlocName, dep: string, version: string
): Promise<Messager> {
  const messager = new Messager('Augmentation de version necessaire');

  let increaseRequirement = null;
  let isRegression = false;
  let pkgHeadDepOldVersion = '';
  const pkgHeadDepVersion = await pkg.head.get([bloc, dep]);
  const depPkg = await pkg.getWorkspace().getPackageByName(dep);

  if ('string' === typeof pkgHeadDepVersion) {
    pkgHeadDepOldVersion = pkgHeadDepVersion;
    if (pkgHeadDepVersion === '*') {
      isRegression = version !== pkgHeadDepVersion;
      increaseRequirement = isRegression ? 'major' : null;
    } else {
      const oldSemver = new Semver(pkgHeadDepVersion);
      isRegression = oldSemver.canBeGreatherThan(version);
      increaseRequirement = isRegression ? 'major' : oldSemver.updateType(version);
    }
  } else {
    // new dependency
    pkgHeadDepOldVersion = '';
    isRegression = false;
    increaseRequirement = null;
  }

  if (!depPkg) increaseRequirement = increaseRequirement && 'fix';

  if (!increaseRequirement) return messager;

  const pkgOldVersion = await pkg.getOldVersion();
  const pkgNewVersion = await pkg.getNewVersion();
  const actualIncreaseType = pkgOldVersion.increaseType(pkgNewVersion);
  const increaseError =
    !actualIncreaseType ||
    Semver[actualIncreaseType.toUpperCase() as Uppercase<SemverBlocName>] <
      Semver[increaseRequirement.toUpperCase() as Uppercase<SemverBlocName>];

  if (increaseError) {
    messager.push(`Dépendance : ${pkgHeadDepOldVersion} => ${version} = ${increaseRequirement}${
      isRegression ? ' (regression)' : ''
    }.`);
    messager.push(`Package : ${pkgOldVersion.toString()} => ${pkgNewVersion.toString()} = ${
      actualIncreaseType ?? 'aucune augmentation de version'
    }.`);
  }
  return messager;
}
