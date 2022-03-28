import fs from 'fs-extra';
import tmp from 'tmp-promise';

import PackageFileGit from './PackageFileGit';
import { cmdOut } from './util';

export default class PackageFileIndex extends PackageFileGit {
  public async save (): Promise<this> {
    const [record, dirty] = await Promise.all([this.json, this.dirty]);
    if (dirty) {
      const { git } = this.pkg.getWorkspace();
      const tmpFile = await tmp.tmpName();

      await fs.writeJSON(tmpFile, record, { spaces: 2 });
      const hash = await git.hashObject(tmpFile, true);
      await cmdOut(`git update-index --add --cacheinfo 100644,${hash},${await this.gitFile}`);
    }
    return this;
  }

  protected async _getJSON (): Promise<Record<string, unknown> | null> {
    const file = await this.gitFile;
    const content = await this.pkg.getWorkspace().git.show(`:${file}`).catch(() => null);

    try {
      return content ? JSON.parse(content) as Record<string, unknown> : null;
    } catch (error: unknown) {
      if (error instanceof Error) error.message += ` in ":${file}"`;
      throw error;
    }
  }
}
