import path from 'path';

import simpleGit from 'simple-git';

import { getLogger } from '../lib/debug';
import Messager from '../lib/Messager';
import type Package from '../lib/Package';
import Workspace from '../lib/Workspace';

const log = getLogger('version(bin)');

const workspaceRoot = path.resolve(__dirname, '../..');

main().then(() => {
  log('main ends successfull');
}, reason => {
  log('main fail with', reason);
});

async function main (): Promise<void> {
  log('main');
  const git = simpleGit();
  const workspace = new Workspace(workspaceRoot, git);
  const messages = new Messager('Impossible de valider le commit à cause des éléments suivants:');

  messages.push(await processChangedFiles(workspace, git));
  messages.push(await processDeps(workspace));

  if (messages.length) {
    messages.prompt();
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

async function processChangedFiles (workspace: Workspace): Promise<Messager> {
  log('processChangedFiles');
  const messages = new Messager('Fichiers modifiés: des fichiers ont été modifiés mais le numéro de version de leur package n\'a pas été mis à jour');
  const gitRoot = await workspace.getGitRoot();
  const modifiedFiles = (await workspace.git.diffSummary('--cached'))
    .files.map(fileItem => path.join(gitRoot, fileItem.file));

  await Promise.all(modifiedFiles.map(async file => {
    messages.push(await processChangedFile(workspace, file));
  }));
  return messages;
}

async function processChangedFile (workspace: Workspace, file: string): Promise<string | null> {
  const pkg = await workspace.getPackageFromFile(file);
  log('processChangedFile', file, 'from package', pkg?.getName());
  if (!pkg) return null;
  const oldVersion = await pkg.getOldValue('version');
  const newVersion = await pkg.getNewValue('version');

  log('processChangedFile', file, { newVersion, oldVersion });
  if (newVersion !== oldVersion) return null;
  return file;
}

async function processDeps (workspace: Workspace): Promise<Messager> {
  log('processDeps');
  const packages = await workspace.getAllPackages();
  const messages = new Messager('Concordance des dépendances');

  await Promise.all(packages.map(async pkg => { messages.push(await processPkgDeps(pkg)); }));
  return messages;
}

async function processPkgDeps (pkg: Package): Promise<Messager> {
  log('processPkgDeps', pkg.getName());
  const messages = new Messager(`dépendances de "${pkg.getName()}"`);
  const blocs: ('dependencies' | 'devDependencies' | 'peerDependencies')[] = [
    'dependencies',
    'peerDependencies',
    'devDependencies',
  ];

  await Promise.all(blocs.map(async bloc => { messages.push(await processPkgDepsBloc(pkg, bloc)); }));
  await pkg.save();
  return messages;
}

async function processPkgDepsBloc (
  pkg: Package,
  bloc: 'dependencies' | 'devDependencies' | 'peerDependencies'
): Promise<Messager> {
  log('processPkgDepsBloc', pkg.getName(), bloc);
  const messages = new Messager(bloc);
  const deps = (await pkg.getNewValue(bloc)) as Record<string, string> | undefined;

  if (!deps) return messages;
  await Promise.all(Object.entries(deps).map(async ([dep, version]) => {
    if (version === '*') return;
    const depPkg = await pkg.getWorkspace().getPackageByName(dep);
    if (!depPkg) return;
    const currentVersion = String(await depPkg.getNewValue('version'));
    if (currentVersion !== version) {
      const error = new Messager(dep);
      error.push(`version actuelle:____${currentVersion}`);
      error.push(`version enregistrée:_${version}`);
      messages.push(error);
      pkg.set([bloc, dep], currentVersion);
    }
  }));

  return messages;
}
