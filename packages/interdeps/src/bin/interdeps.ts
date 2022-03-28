import { program } from 'commander';

import { processInterdeps, getLogger } from '../lib';

const log = getLogger('interdeps-cli');

program
  .storeOptionsAsProperties(false)
  .option('--fix', 'Automatically fix problems')
  .action(processInterdeps)
  .parseAsync(process.argv)
  .then(() => {
    log('main ends successfull');
  }, reason => {
    console.info('main fail with', reason);
    process.exit(1);
  });
