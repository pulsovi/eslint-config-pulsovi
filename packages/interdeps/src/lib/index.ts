import path from 'path';

import simpleGit from 'simple-git';

import CodeDiffManager from './CodeDiffManager';
import { workspaceRoot } from './config';
import DepsDiffManager from './DepsDiffManager';
import Messager from './Messager';
import { getLogger } from './util';
import Workspace from './Workspace';
// import type { Semver } from './types.d'

const log = getLogger('lib/index');

export async function processInterdeps (options: InterdepsOptions): Promise<void> {
  log('main');
  const git = simpleGit();
  const gitRoot = await git.revparse('--show-toplevel');
  const workspace = new Workspace(path.join(gitRoot, workspaceRoot), git);
  const failMessage = new Messager('Impossible de valider le commit à cause des éléments suivants:');

  const codeDiffManager = new CodeDiffManager(workspace);
  const modifiedFiles = await codeDiffManager.processAllPackages();
  const codeDiffMessager = new Messager('Fichiers modifiés: des fichiers ont été modifiés mais le numéro de version de leur package n\'a pas été mis à jour');

  if (modifiedFiles.length) fail(failMessage.push(codeDiffMessager.concat(modifiedFiles)));

  const depsDiffManager = new DepsDiffManager(workspace);
  if (options.fix)
    await depsDiffManager.fixAllPackages();
  else {
    failMessage.push(await depsDiffManager.promptAll());
    if (failMessage.length) fail(failMessage);
  }
}

function fail (messages: Messager): void {
  messages.prompt();
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}

export { getLogger };
