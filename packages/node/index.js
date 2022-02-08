// Fix eslint shareable config (https://github.com/eslint/eslint/issues/3458)
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  'extends': [
    'plugin:node/recommended',
    'pulsovi',
  ],
  ignorePatterns: ['node_modules'],
  rules: {
    'no-console': ['warn', { allow: ['error', 'info'] }],
  },
};
