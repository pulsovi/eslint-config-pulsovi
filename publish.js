const childProcess = require('child_process');
const fs = require('fs');

function run (command, args) {
  const bash = 'E:\\usr\\local\\bin\\cmder\\vendor\\git-for-windows\\bin\\bash';
  const subprocess = childProcess.spawn(command, args, {
    stdio: 'pipe',
    shell: bash,
  });
  return Promise.all([getIo(subprocess), endProcess(subprocess)])
    .then(([io]) => io);
}

function getIo (subprocess) {
  return Promise.all([subprocess.stdout, subprocess.stdin]
    .map(stream => new Promise(resolve => {
      let text = '';
      stream.on('data', chunk => { text += chunk; });
      stream.once('close', () => resolve(text));
    })));
}

function endProcess (subprocess) {
  return new Promise((resolve, reject) => {
    subprocess.once('close', resolve);
    subprocess.once('error', reject);
  });
}

run('git', ['status', '--porcelain']).then(([stdout, stderr]) => {
  console.log({ stderr, stdout });
});
