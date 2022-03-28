import PackageFileGit from './PackageFileGit';

export default class PackageFileHead extends PackageFileGit {
  public async save (): Promise<this> {
    throw new Error(`Unable to modify the HEAD version of the file "${await this.gitFile}"`);
  }

  protected async _getJSON (): Promise<Record<string, unknown> | null> {
    const file = await this.gitFile;
    const content = await this.pkg.getWorkspace().git.show(`HEAD:${file}`).catch(() => null);

    try {
      return content ? JSON.parse(content) as Record<string, unknown> : null;
    } catch (error: unknown) {
      if (error instanceof Error) error.message += ` in "HEAD:${file}"`;
      throw error;
    }
  }
}
