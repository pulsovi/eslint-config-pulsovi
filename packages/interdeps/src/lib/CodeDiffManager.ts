import path from 'path';

import { diff as jsDiff } from 'deep-diff';

import DepsDiffManager from './DepsDiffManager';
import type Package from './Package';
import { getLogger, todo } from './util';
import type Workspace from './Workspace';

const log = getLogger('CodeDiffManager');

export default class CodeDiffManager {
  private readonly workspace: Workspace;

  public constructor (workspace: Workspace) {
    this.workspace = workspace;
  }

  private static async isModifiedPackageFile (pkg: Package): Promise<boolean> {
    log('isModifiedPackageFile', pkg.getName());
    const headJS = await pkg.head.getJS();
    const indexJS = await pkg.index.getJS();
    const diff = jsDiff(headJS, indexJS) ?? [];
    const filteredDiff = diff.filter(diffItem => {
      if (
        diffItem.kind === 'E' &&
        DepsDiffManager.DEPS_BLOC_NAMES.includes(diffItem.path?.[0] as unknown)
      ) return false;
      return true;
    });
    const realDiffs = filteredDiff.filter(diffItem => {
      if (diffItem.kind !== 'E') return true;
      return false;
    });

    if (!filteredDiff.length) return false;
    if (realDiffs.length) return true;
    console.error(
      'CodeDiffManager@isModifiedPackageFile: unknown package file modification : ',
      filteredDiff.filter(diffItem => !realDiffs.includes(diffItem)),
      '\nsee: https://www.npmjs.com/package/deep-diff',
    );
    return await Promise.resolve(todo() as boolean);
  }

  public async processAllPackages (): Promise<string[]> {
    log('processAllPackages');
    const gitRoot = await this.workspace.getGitRoot();
    const diff = await this.workspace.git.diffSummary('--cached');
    const modifiedFiles = await Promise.all(diff.files.map(async fileItem => {
      const file = path.join(gitRoot, fileItem.file);
      const pkg = await this.workspace.getPackageFromFile(file);

      if (!pkg) return null;
      if (await pkg.versionIncrease()) return null;
      if (pkg.getPackageFile() === file) {
        const reallyModified = await CodeDiffManager.isModifiedPackageFile(pkg);
        if (!reallyModified) return null;
      }
      return file;
    }));
    return modifiedFiles.filter((file): file is string => typeof file === 'string');
  }
}
