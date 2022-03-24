import path from 'path';

import deepExtend from 'deep-extend';
import fs from 'fs-extra';
import { get, set } from 'lodash';

import Semver from './Semver';
import type { SemverBlocName } from './Semver';
import type Workspace from './Workspace';

export default class Package {
  private pkgOld: Promise<Record<string, unknown> | null> | null = null;
  private pkgNew: Promise<Record<string, unknown> | null> | null = null;
  private pkgWork: Promise<Record<string, unknown> | null> | null = null;
  private dirty: Promise<boolean> = Promise.resolve(false);
  private readonly packageFile: string;
  private readonly workspace: Workspace;

  public constructor (packageFile: string, workspace: Workspace) {
    this.packageFile = packageFile;
    this.workspace = workspace;
  }

  public getWorkspace (): Workspace {
    return this.workspace;
  }

  public getPackageFile (): string {
    return this.packageFile;
  }

  public getName (): string {
    return this.packageFile.slice(this.workspace.getWorkspaceFolder().length).split(path.sep)[1];
  }

  public async getOldValue (prop: string[] | string): Promise<unknown> {
    const js = await this.getOldJS();
    return get(js, prop) as unknown;
  }

  public async getOldVersion (): Promise<Semver> {
    return new Semver(await this.getOldValue('version') as string);
  }

  public async getNewValue (prop: string[] | string): Promise<unknown> {
    const js = await this.getNewJS();
    return get(js, prop) as unknown;
  }

  public async getNewVersion (): Promise<Semver> {
    return new Semver(await this.getNewValue('version') as string);
  }

  public async versionIncrease (): Promise<SemverBlocName | false> {
    const oldVersion = await this.getOldValue('version') as string;
    const newVersion = await this.getNewValue('version') as string;
    const semver = new Semver(newVersion);

    if (!semver.isGreatherThan(oldVersion)) return false;
    return semver.updateType(oldVersion) ?? false;
  }

  public set (prop: string[], value: unknown): void {
    const currentValue = this.getWorkJS();
    this.pkgWork = currentValue.then(jsval => {
      if (!jsval)
        throw new Error(`impossible de changer le contenu du fichier "${this.packageFile}", il n'existe pas.`);
      return set(deepExtend({}, jsval), prop, value);
    });
    this.dirty = this.pkgWork.then(() => true);
  }

  public async save (): Promise<this> {
    const [record, dirty] = await Promise.all([this.pkgWork, this.dirty]);
    if (dirty) await fs.writeJSON(this.packageFile, record, { spaces: 2 });
    return this;
  }

  private async getWorkJS (): Promise<Record<string, unknown> | null> {
    if (!this.pkgWork) this.pkgWork = this._getWorkJS();
    return await this.pkgWork;
  }

  private async _getWorkJS (): Promise<Record<string, unknown> | null> {
    const jsval = (
      await fs.readJSON(this.packageFile, { 'throws': false })
    ) as Record<string, unknown> | null;
    return jsval;
  }

  private async _getJS (ref: ':' | 'HEAD:'): Promise<Record<string, unknown> | null> {
    const gitRoot = await this.workspace.getGitRoot();
    const file = path.relative(gitRoot, this.packageFile).replace(/\\/gu, '/');
    const content = await this.workspace.git.show(`${ref}${file}`).catch(() => null);

    try {
      return content ? JSON.parse(content) as Record<string, unknown> : null;
    } catch (error: unknown) {
      if (error instanceof Error) error.message += ` in "${ref}${file}"`;
      throw error;
    }
  }

  private async getOldJS (): Promise<Record<string, unknown> | null> {
    if (!this.pkgOld) this.pkgOld = this._getJS('HEAD:');
    const jsval = await this.pkgOld;
    return jsval ? deepExtend({}, jsval) : null;
  }

  private async getNewJS (): Promise<Record<string, unknown> | null> {
    if (!this.pkgNew) this.pkgNew = this._getJS(':');
    const jsval = await this.pkgNew;
    return jsval ? deepExtend({}, jsval) : null;
  }
}
