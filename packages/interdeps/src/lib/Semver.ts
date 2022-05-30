interface SemverRecord {
  sigil: string;
  fix: number;
  major: number;
  minor: number;
  or?: Semver | null;
}
export type SemverBlocName = 'fix' | 'major' | 'minor';

export default class Semver {
  public static readonly REGEX = /^(?<sigil>[\^~]?)(?<major>\d+)\.(?<minor>\d+)\.(?<fix>\d+)(?: ?\|\| ?(?<or>.*))?$/u;
  public static readonly BLOC_NAMES: SemverBlocName[] = ['major', 'minor', 'fix'];
  public static readonly NULL = 0;
  public static readonly FIX = 1;
  public static readonly MINOR = 2;
  public static readonly MAJOR = 3;

  private readonly sigil: string;
  private readonly major: number;
  private readonly minor: number;
  private readonly fix: number;
  private readonly or: Semver | null;
  private readonly source: SemverRecord | string;

  public constructor (semver: SemverRecord | string) {
    if (!['string', 'object'].includes(typeof semver) || !semver)
      throw new TypeError(`The "semver" must be string or object, ${semver as string} provided`);
    this.source = semver;
    const record = Semver.split(semver);
    this.sigil = record.sigil;
    this.major = record.major;
    this.minor = record.minor;
    this.fix = record.fix;
    this.or = record.or;
  }

  public static blocRank (bloc: SemverBlocName | null): 0 | 1 | 2 | 3 {
    const key = String(bloc).toUpperCase() as 'FIX' | 'MAJOR' | 'MINOR' | 'NULL';
    return Semver[key];
  }

  public static from (semver: Semver | SemverRecord | string): Semver {
    if (semver instanceof Semver) return semver;
    return new Semver(semver);
  }

  public static maxBloc (blocs: (SemverBlocName | null)[]): SemverBlocName | null {
    return blocs.reduce((blocA, blocB) => {
      if (Semver.blocRank(blocA) > Semver.blocRank(blocB)) return blocA;
      return blocB;
    });
  }

  public static sort (semverA: Semver, semverB: Semver): -1 | 0 | 1 {
    for (const bloc of this.BLOC_NAMES) {
      const sortResult = this.sortBy(bloc, semverA, semverB);
      if (sortResult) return sortResult;
    }
    return 0;
  }

  public static sortBy (bloc: SemverBlocName, semverA: Semver, semverB: Semver): -1 | 0 | 1 {
    if (semverA.toString() === semverB.toString()) return 0;
    if (semverA.or || semverB.or) throw new Error('Cannot compare OR Semver');

    const sigil = {
      fix: '~',
      major: '*',
      minor: '^',
    }[bloc];

    if (semverA.sigil === sigil) {
      if (semverB.sigil === sigil) return 0;
      return 1;
    }
    if (semverB.sigil === sigil) return -1;

    if (semverA[bloc] > semverB[bloc]) return 1;
    if (semverB[bloc] > semverA[bloc]) return -1;
    return 0;
  }

  public static split (semver: SemverRecord | string): Required<SemverRecord> {
    if (semver === '*') return { fix: 0, major: 0, minor: 0, or: null, sigil: '*' };

    if ('string' !== typeof semver) {
      return {
        ...semver,
        or: semver.or ?? null,
      };
    }

    if (!Semver.REGEX.test(semver))
      throw new Error(`The semver arg "${semver}" is not a valid semver string`);
    const groups = Semver.REGEX.exec(semver)?.groups as Record<keyof SemverRecord, string>;
    const { fix, major, minor, sigil, or } = groups;

    return {
      fix: parseInt(fix, 10),
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      or: or ? new Semver(or) : null,
      sigil,
    };
  }

  public clone (diff: Partial<SemverRecord> = {}): Semver {
    return new Semver({
      fix: this.fix,
      major: this.major,
      minor: this.minor,
      or: this.or ? this.or.clone() : null,
      sigil: this.sigil,
      ...diff,
    });
  }

  public increase (bloc: SemverBlocName): Semver {
    if (this.or) throw new Error('Cannot increase OR semver');
    const diff: Partial<SemverRecord> = {};
    if (this.sigil !== '*') {
      diff[bloc] = this[bloc] + 1;
      if (Semver.blocRank(bloc) > Semver.MINOR) diff.minor = 0;
      if (Semver.blocRank(bloc) > Semver.FIX) diff.fix = 0;
    }
    return this.clone(diff);
  }

  public isGreatherThan (semver: Semver | SemverRecord | string): boolean {
    return Semver.sort(this, Semver.from(semver)) > 0;
  }

  public isLowerThan (semver: Semver | string): boolean {
    return Semver.sort(this, Semver.from(semver)) < 0;
  }

  public updateType (semver: Semver | string): SemverBlocName | null {
    const semverInstance = Semver.from(semver);
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
    if (typeof this.source === 'string') return this.source;
    if (this.sigil === '*') return this.sigil;
    return `${this.sigil}${this.major}.${this.minor}.${this.fix}${this.or ? ` || ${this.or.toString()}` : ''}`;
  }

  public toFixedString (): string {
    return `${this.major}.${this.minor}.${this.fix}`;
  }
}
