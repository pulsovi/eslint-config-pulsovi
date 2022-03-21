#!/usr/bin/env zx
// Replaces semantic-release with zx script

/* eslint-disable max-lines-per-function, no-bitwise, no-console, node/shebang */
/* global $, __dirname */
/* eslint-env node */
/* eslint id-length: ["warn", { "exceptions": ["$"]}] */
import * as path from 'path';

import { readPackageUpAsync } from 'read-pkg-up';

(async $ => {
  $.verbose = !!process.env.VERBOSE;
  $.noquote = async (...args) => {
    const { quote } = $;
    $.quote = spchar => spchar;
    const subprocess = $(...args);
    await subprocess;
    $.quote = quote;
    return subprocess;
  };

  // Git configuration
  const GIT_COMMITTER_NAME = (await $`git config --get user.name`).toString().trim();
  const { GH_TOKEN } = process.env;

  if (!GH_TOKEN)
    throw new Error('env.GH_TOKEN must be set');

  const originUrl = (await $`git config --get remote.origin.url`).toString().trim();
  const [, repoHost, repoName] = originUrl.replace(':', '/').replace(/\.git/u, '')
    .match(/.+(?=@|\/\/)(?<host>[^/]+)\/(?<name>.+)$/u);
  const repoPublicUrl = `https://${repoHost}/${repoName}`;

  // Commits analysis
  const { packageJson: { name: packageName }, path: packagePath } = await readPackageUpAsync();
  const packageFolder = path.dirname(path.relative(__dirname, packagePath)).replace(/\\/gu, '/');
  const semanticTagPattern = packageName ?
    RegExp(`^${packageName}-v?(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)$`, 'u') :
    /^v?(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)$/u;
  const releaseSeverityOrder = ['major', 'minor', 'patch'];
  const semanticRules = [
    { group: 'Features', prefixes: ['feat'], releaseType: 'minor' },
    {
      group: 'Fixes & improvements',
      prefixes: ['fix', 'perf', 'refactor', 'docs'],
      releaseType: 'patch',
    },
    {
      group: 'BREAKING CHANGES',
      keywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
      releaseType: 'major',
    },
  ];

  const tags = (await $`git tag -l --sort=-v:refname`).toString().split('\n').map(tag => tag.trim());
  const lastTag = tags.find(tag => semanticTagPattern.test(tag));
  const commitsRange = lastTag ? `${(await $`git rev-list -1 ${lastTag}`).toString().trim()}..HEAD` : 'HEAD';
  const newCommits = (await $.noquote`git log --name-only --format=+++%s__%b__%h__%H__ ${commitsRange}`)
    .toString()
    .split('+++')
    .filter(Boolean)
    .map(msg => {
      const [subj, body, short, hash, files] = msg.split('__').map(raw => raw.trim());
      return { body, files: files.split('\n'), hash, short, subj };
    })
    .filter(commit => commit.files.some(file => file.startsWith(packageFolder)));

  const semanticChanges = newCommits.reduce((acc, { body, files, hash, short, subj }) => {
    semanticRules.forEach(({ group, releaseType, prefixes, keywords }) => {
      const prefixMatcher = prefixes && new RegExp(`^(${prefixes.join('|')})(\\(\\w+\\))?:\\s.+$`, 'u');
      const keywordsMatcher = keywords && new RegExp(`(${keywords.join('|')}):\\s(.+)`, 'u');
      const change = (subj.match(prefixMatcher) && subj.match(prefixMatcher)[0]) ||
        (body.match(keywordsMatcher) && body.match(keywordsMatcher)[2]);

      if (change) {
        acc.push({
          body,
          change,
          files,
          group,
          hash,
          releaseType,
          short,
          subj,
        });
      }
    });
    return acc;
  }, []);

  console.log('semanticChanges=', semanticChanges);
  const nextReleaseType = releaseSeverityOrder.find(
    type => semanticChanges.find(({ releaseType }) => type === releaseType)
  );

  if (!nextReleaseType) {
    console.log('No semantic changes - no semantic release.');
    return;
  }
  const nextVersion = ((lastVersion, releaseType) => {
    if (!lastVersion)
      return '1.0.0';

    const [, c1, c2, c3] = semanticTagPattern.exec(lastVersion);
    if (releaseType === 'major')
      return `${-~c1}.0.0`;

    if (releaseType === 'minor')
      return `${c1}.${-~c2}.0`;

    if (releaseType === 'patch')
      return `${c1}.${c2}.${-~c3}`;
    return null;
  })(lastTag, nextReleaseType);

  const nextTag = packageName ? `${packageName}-v${nextVersion}` : `v${nextVersion}`;
  // eslint-disable-next-line no-magic-numbers
  const releaseDiffRef = `## [${nextVersion}](${repoPublicUrl}/compare/${lastTag}...${nextTag}) (${new Date().toISOString().slice(0, 10)})`;
  const releaseDetails = Object.values(semanticChanges
    .reduce((acc, { group, change, short, hash }) => {
      const { commits } = acc[group] || (acc[group] = { commits: [], group });
      const commitRef = `* ${change} ([${short}](${repoPublicUrl}/commit/${hash}))`;

      commits.push(commitRef);

      return acc;
    }, {}))
    .map(({ group, commits }) => `
  ### ${group}
  ${commits.join('\n')}`).join('\n');

  const releaseNotes = `${releaseDiffRef}\n${releaseDetails}\n`;

  // Update changelog
  await $`echo ${releaseNotes}"\n$(cat ./CHANGELOG.md)" > ./CHANGELOG.md`;

  // Update package.json version
  await $`npm --no-git-tag-version version ${nextVersion}`;

  /*
   * Prepare git commit and push
   * Hint: PAT may be replaced with a SSH deploy token
   * https://stackoverflow.com/questions/26372417/github-oauth2-token-how-to-restrict-access-to-read-a-single-private-repo
   */
  process.exit();
  const releaseMessage = `chore(release): ${nextVersion} [skip ci]`;
  await $`git add -A .`;
  await $`git commit -am "${releaseMessage}"`;
  await $`git tag -a ${nextTag} HEAD -m "${releaseMessage}"`;
  await $`git push --follow-tags origin HEAD:refs/heads/master`;

  // Push GitHub release
  const releaseData = JSON.stringify({
    body: releaseNotes,
    name: nextTag,
    tag_name: nextTag,
  });

  await $`curl -u ${GIT_COMMITTER_NAME}:${GH_TOKEN} -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/${repoName}/releases -d ${releaseData}`;

  // Publish npm artifact
  await $`npm publish --no-git-tag-version`;

  console.log(chalk.bold('Great success!'));
})($);
