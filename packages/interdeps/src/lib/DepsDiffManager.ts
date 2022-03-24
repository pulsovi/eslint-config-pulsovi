import Messager from './Messager';
import type Package from './Package';
import Semver from './Semver';
import type { SemverBlocName } from './Semver';
import { getLogger, todo } from './util';
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
    await Promise.resolve(todo(this));
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

    if (version === '*') return messager;

    const depPkg = await this.workspace.getPackageByName(dep);
    if (depPkg) {
      const currentVersion = String(await depPkg.getNewValue('version'));
      if (currentVersion !== version) {
        const error = new Messager('Dépendance non cohérente');
        error.push(`version actuelle de ${dep}: ${currentVersion}`);
        error.push(`version utilisée dans ${pkg.getName()}: ${version}`);
        messager.push(error);
      }
    }

    const oldVersion = await pkg.getOldValue([bloc, dep]) as string;
    const oldSemver = new Semver(oldVersion);
    const isRegression = oldSemver.isLowerThan(version);
    const increaseRequirement = isRegression ? 'major' : oldSemver.updateType(version);

    if (increaseRequirement) {
      const pkgOldVersion = await pkg.getOldVersion();
      const pkgNewVersion = await pkg.getNewVersion();
      const actualIncreaseType = pkgOldVersion.increaseType(pkgNewVersion);
      const increaseError =
        !actualIncreaseType ||
        Semver[actualIncreaseType.toUpperCase() as Uppercase<SemverBlocName>] <
          Semver[increaseRequirement.toUpperCase() as Uppercase<SemverBlocName>];

      if (increaseError) {
        const error = new Messager('Augmentation de version necessaire');
        error.push(`Dépendance : ${oldVersion} => ${version} = ${increaseRequirement}${
          isRegression ? ' (regression)' : ''
        }.`);
        error.push(`Package : ${pkgOldVersion.toString()} => ${pkgNewVersion.toString()} = ${
          actualIncreaseType ?? 'aucune augmentation de version'
        }.`);
        messager.push(error);
      }
    }

    return messager;
  }
}
