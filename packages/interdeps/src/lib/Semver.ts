interface SemverRecord {
  major: number;
  minor: number;
  fix: number;
}
export type SemverBlocName = 'fix' | 'major' | 'minor';

export default class Semver {
  public static readonly REGEX = /^[\^~]?(?<major>\d+)\.(?<minor>\d+)\.(?<fix>\d+)/u;
  public static readonly BLOC_NAMES: SemverBlocName[] = ['major', 'minor', 'fix'];
  public static readonly FIX = 1;
  public static readonly MINOR = 2;
  public static readonly MAJOR = 3;

  private readonly major: number;
  private readonly minor: number;
  private readonly fix: number;
  private readonly source: string;

  public constructor (semver: string) {
    const { fix, major, minor } = Semver.split(semver);
    this.major = major;
    this.minor = minor;
    this.fix = fix;
    this.source = semver;
  }

  public static from (semver: Semver | string): Semver {
    if (semver instanceof Semver) return semver;
    return new Semver(semver);
  }

  public static split (semver: string): SemverRecord {
    if (!Semver.REGEX.test(semver))
      throw new Error(`The semver arg "${semver}" is not a valid semver string`);
    const { fix, major, minor } = Semver.REGEX.exec(semver)?.groups as Record<SemverBlocName, string>;
    return {
      fix: parseInt(fix, 10),
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
    };
  }

  public isGreatherThan (semver: Semver | string): boolean {
    const semverInstance = Semver.from(semver);
    if (this.major > semverInstance.major) return true;
    if (this.major < semverInstance.major) return false;
    if (this.minor > semverInstance.minor) return true;
    if (this.minor < semverInstance.minor) return false;
    if (this.fix > semverInstance.fix) return true;
    return false;
  }

  public isLowerThan (semver: Semver | string): boolean {
    return Semver.from(semver).isGreatherThan(this);
  }

  public updateType (semver: Semver | string): SemverBlocName | null {
    const semverInstance = Semver.from(semver);
    // eslint-disable-next-line no-restricted-syntax
    for (const bloc of Semver.BLOC_NAMES)
      if (this[bloc] !== semverInstance[bloc]) return bloc;
    return null;
  }

  public increaseType (newVersion: Semver | string): SemverBlocName | null {
    const newSemver = Semver.from(newVersion);
    if (!newSemver.isGreatherThan(this)) return null;
    return this.updateType(newSemver);
  }

  public toString (): string {
    return `${this.major}.${this.minor}.${this.fix}`;
  }
}
