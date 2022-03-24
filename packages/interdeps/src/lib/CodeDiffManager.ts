import path from 'path';

import type Package from './Package';
import { getLogger, todo } from './util';
import type Workspace from './Workspace';

const log = getLogger('CodeDiffManager');

export default class CodeDiffManager {
  private readonly workspace: Workspace;

  public constructor (workspace: Workspace) {
    this.workspace = workspace;
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
        const reallyModified = await this.isModifiedPackageFile(pkg);
        if (!reallyModified) return null;
      }
      return file;
    }));
    return modifiedFiles.filter((file): file is string => typeof file === 'string');
  }

  private async isModifiedPackageFile (pkg: Package): Promise<boolean> {
    return await Promise.resolve(todo(this, pkg) as boolean);
    // vérifier la présence de nouvelles dépendances ou la suppression de dépendances
  }
}
