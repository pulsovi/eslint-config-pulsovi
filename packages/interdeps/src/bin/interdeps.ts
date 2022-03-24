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
    log('main fail with', reason);
  });
