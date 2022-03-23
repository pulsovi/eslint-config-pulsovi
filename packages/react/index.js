// Fix eslint shareable config (https://github.com/eslint/eslint/issues/3458)
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  'extends': [
    require.resolve('./base'),
    'react-app/jest',
    'plugin:react/recommended',
    'pulsovi-browser',
  ],
  ignorePatterns: ['build', 'node_modules'],
  overrides: [{
    files: ['*.jsx', '*.js'],
  }],
  parser: 'espree',
  parserOptions: {
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks',
  ],
  settings: {
    'import/resolver': {
      node: { extensions: ['.js', '.jsx'] },
    },
  },
  rules: {
    'max-lines-per-function': 'off',
    'react/no-typos': 'error',
    'react/prop-types': 'error',
    'react-hooks/rules-of-hooks': 'error',
  },
};
