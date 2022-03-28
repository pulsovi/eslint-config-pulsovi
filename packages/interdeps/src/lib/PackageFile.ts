import EventEmitter from 'events';

import deepExtend from 'deep-extend';
import { get, set } from 'lodash';

import type Package from './Package';
import Semver from './Semver';

export default abstract class PackageFile extends EventEmitter {
  protected readonly file: string;
  protected readonly pkg: Package;
  protected json: Promise<Record<string, unknown> | null> | null = null;
  protected dirty: Promise<boolean> = Promise.resolve(false);

  public constructor (file: string, pkg: Package) {
    super();
    this.file = file;
    this.pkg = pkg;
  }

  public async get (prop: string[] | string): Promise<unknown> {
    const json = await this.getJSON();
    return get(json, prop) as unknown;
  }

  public async getJS (): Promise<Record<string, unknown> | null> {
    const json = await this.getJSON();
    if (!json) return json;
    const clone = deepExtend({}, json);
    return clone;
  }

  public async getVersion (): Promise<Semver> {
    return new Semver(await this.get('version') as string);
  }

  public set (prop: string[], value: unknown): void {
    const currentValue = this.getJSON();
    this.json = currentValue.then(jsonVal => {
      if (!jsonVal)
        throw new Error(`impossible de changer le contenu du fichier "${this.file}", il n'existe pas.`);
      return set(deepExtend({}, jsonVal), prop, value);
    });
    this.dirty = this.json.then(() => true);
  }

  public setVersion (version: string): void {
    this.set(['version'], version);
  }

  private async getJSON (): Promise<Record<string, unknown> | null> {
    if (!this.json) this.json = this._getJSON();
    return await this.json;
  }

  public abstract save (): Promise<this>;

  protected abstract _getJSON (): Promise<Record<string, unknown> | null>;
}
