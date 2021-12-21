// Fix eslint shareable config (https://github.com/eslint/eslint/issues/3458)
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    node: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    babelOptions: {
      presets: [require.resolve('babel-preset-react-app/prod')],
    },
    requireConfigFile: false,
    sourceType: 'module',
  },
  plugins: ['react'],
  root: true,
  rules: {
    'react/jsx-uses-react': 'warn',
    'react/jsx-uses-vars': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
