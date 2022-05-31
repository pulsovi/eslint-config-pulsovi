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

  /**
   * Is the package.json manifest of the pkg is modified
   *
   * if only dependencies of the package are modified, the package is not considered modified
   * since the dependencies modifications are managed separately.
   */
  private static async isModifiedPackageFile (pkg: Package): Promise<boolean> {
    log('isModifiedPackageFile', pkg.getName());
    const headJS = await pkg.head.getJS();
    const indexJS = await pkg.index.getJS();
    const diff = jsDiff(headJS, indexJS) ?? [];
    // filter the dependencies differences out
    return diff.some(diffItem => !DepsDiffManager.DEPS_BLOC_NAMES.includes(diffItem.path?.[0] as unknown));
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
