declare interface InterdepsOptions {
  fix: boolean;
}
declare type DepsString = 'dependencies' | 'devDependencies' | 'peerDependencies';
declare type Semver = 'fix' | 'major' | 'minor';
