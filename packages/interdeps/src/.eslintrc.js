const path = require('path');

module.exports = {
  overrides: [{
    'extends': 'pulsovi-typescript',
    files: ['bin/*.ts', 'lib/*.ts'],
    parserOptions: {
      project: path.resolve(__dirname, '../tsconfig.json'),
    },
  }],
};
