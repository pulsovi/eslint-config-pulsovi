import path from 'path';

import fs from 'fs-extra';
import simpleGit from 'simple-git';
import type { SimpleGit } from 'simple-git';

import { excludePackages } from './config';
import Package from './Package';
import { getLogger } from './util';

const log = getLogger(path.basename(__filename, path.extname(__filename)));

export default class Workspace {
  private readonly workspaceFolder: string;
  private readonly _git: SimpleGit;
  private gitRoot?: Promise<string>;
  private packages: Record<string, Package> = {};
  private allPackages?: Promise<Package[]>;
  public constructor (workspaceFolder: string, git: SimpleGit = simpleGit()) {
    this.workspaceFolder = workspaceFolder;
    this._git = git;
  }

  public get git (): SimpleGit {
    return this._git;
  }

  public getWorkspaceFolder (): string {
    return this.workspaceFolder;
  }

  public async getPackageFromPackageFile (packageFile: string): Promise<Package | null> {
    log('getPackageFromPackageFile', packageFile);
    if (!packageFile.startsWith(this.workspaceFolder)) return null;
    if (packageFile in this.packages) return this.packages[packageFile];
    if (!await fs.pathExists(packageFile)) return null;
    this.packages[packageFile] = new Package(packageFile, this);
    return this.packages[packageFile];
  }

  public async getPackageFromFile (file: string): Promise<Package | null> {
    log('getPackageFromFile', file, this.workspaceFolder, path.relative(this.workspaceFolder, file));
    const packageFile = path.join(
      this.workspaceFolder,
      path.relative(this.workspaceFolder, file).split(path.sep)[0],
      'package.json'
    );
    return await this.getPackageFromPackageFile(packageFile);
  }

  public async getAllPackages (): Promise<Package[]> {
    log('getAllPackages');
    if (!this.allPackages) this.allPackages = this._getAllPackages();
    return await this.allPackages;
  }

  public async getPackageByName (name: string): Promise<Package | null> {
    const packages = await this.getAllPackages();
    const tuples = await Promise.all(packages.map(
      async pkgItem => [await pkgItem.getNewValue('name'), pkgItem] as [string, Package]
    ));
    const found = tuples.find(([pkgName]) => pkgName === name);

    if (found) return found[1];
    return null;
  }

  public async getGitRoot (): Promise<string> {
    if (!this.gitRoot) this.gitRoot = this._gteGitRoot();
    return await this.gitRoot;
  }

  private async _gteGitRoot (): Promise<string> {
    const topLevel = await this.git.revparse('--show-toplevel');
    return topLevel;
  }

  private async _getAllPackages (): Promise<Package[]> {
    const dirents = await fs.readdir(this.workspaceFolder, { withFileTypes: true });
    const rawPackages = await Promise.all(dirents.map(async dirent => {
      if (!dirent.isDirectory()) return null;
      if (excludePackages.includes(dirent.name)) return null;
      const packageFile = path.resolve(this.workspaceFolder, dirent.name, 'package.json');
      return await this.getPackageFromPackageFile(packageFile);
    }));
    const packages = rawPackages.filter((pkg): pkg is Package => pkg instanceof Package);

    packages.forEach(pkg => { this.packages[pkg.getPackageFile()] = pkg; });
    return packages;
  }
}
