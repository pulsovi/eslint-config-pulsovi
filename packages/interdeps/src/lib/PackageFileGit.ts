import path from 'path';

import type Package from './Package';
import PackageFile from './PackageFile';

export default abstract class PackageFileGit extends PackageFile {
  protected readonly gitFile: Promise<string>;

  public constructor (file: string, pkg: Package) {
    super(file, pkg);
    this.gitFile = this.getGitFile();
  }

  private async getGitFile (): Promise<string> {
    const workspace = this.pkg.getWorkspace();
    const gitRoot = await workspace.getGitRoot();
    const gitFile = path.relative(gitRoot, this.file).replace(/\\/gu, '/');
    return gitFile;
  }
}
