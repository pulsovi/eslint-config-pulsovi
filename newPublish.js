const path = require('path');

const execa = require('execa');
const prompts = require('prompts');

const getChannel = require('./get-channel');
const getRegistry = require('./get-registry');
const getReleaseInfo = require('./get-release-info');

let sync = Promise.resolve();
module.exports = async (npmrc, { npmPublish, pkgRoot }, pkg, context) => {
  const {
    cwd,
    env,
    stdout,
    stderr,
    nextRelease: { version, channel },
    logger,
  } = context;

  if (npmPublish !== false && pkg.private !== true) {
    const basePath = pkgRoot ? path.resolve(cwd, pkgRoot) : cwd;
    const registry = getRegistry(pkg, context);
    const distTag = getChannel(channel);

    logger.log(`Publishing version ${version} to npm registry on dist-tag ${distTag}`);
    await sync;
    sync = sync.then(() => publish({
      args: ['publish', basePath, '--userconfig', npmrc, '--tag', distTag, '--registry', registry],
      cwd,
      env,
      pkg,
      stderr,
      stdout,
      version,
    }));
    await sync;
    logger.log(`Published ${pkg.name}@${version} to dist-tag @${distTag} on ${registry}`);

    return getReleaseInfo(pkg, context, distTag, registry);
  }

  logger.log(
    `Skip publishing to npm registry as ${npmPublish === false ? 'npmPublish' : "package.json's private property"} is ${
      npmPublish !== false
    }`
  );

  return false;
};

async function publish ({ allowed, args, cwd, env, otp, pkg, stderr, stdout, version }) {
  const { allow } = allowed ?
    { allow: true } :
    await prompts({
      initial: true,
      name: 'allow',
      message: `Publish ${pkg.name}@${version} to npm registry ?`,
      type: 'confirm',
    });

  const { OTP } = otp ?
    await prompts({
      name: 'OTP',
      message: 'Type the OTP code',
      type: 'text',
      validate: value => {
        console.log('otp validation', { value }, (/^\d{6}$/u).test(value));
        return (/^\d{6}$/u).test(value);
      },
    }) :
    null;

  if (!options.allow) throw new Error(`Publishing ${pkg.name}@${version} to npm registry aborted.`);

  const result = execa('npm', args.concat(OTP ? `--otp=${OTP}` : []), { cwd, env });
  result.stdout.pipe(stdout, { end: false });
  result.stderr.pipe(stderr, { end: false });
  return await result.catch(error => {
    if (error.code === 'EOTP')
      return publish({ allowed: allow, args, cwd, env, otp: true, pkg, stderr, stdout, version });
    throw error;
  });
}
