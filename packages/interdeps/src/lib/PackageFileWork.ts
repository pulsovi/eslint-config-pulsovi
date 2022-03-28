import fs from 'fs-extra';

import PackageFile from './PackageFile';

export default class PackageFileWork extends PackageFile {
  public async save (): Promise<this> {
    const [record, dirty] = await Promise.all([this.json, this.dirty]);
    if (dirty) await fs.writeJSON(this.file, record, { spaces: 2 });
    return this;
  }

  protected async _getJSON (): Promise<Record<string, unknown> | null> {
    const jsval = (
      await fs.readJSON(this.file, { 'throws': false })
    ) as Record<string, unknown> | null;
    return jsval;
  }
}
