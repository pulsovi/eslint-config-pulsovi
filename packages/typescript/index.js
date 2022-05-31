// Fix eslint shareable config (https://github.com/eslint/eslint/issues/3458)
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  'extends': [
    'pulsovi-node',
    'plugin:@typescript-eslint/all',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.d.ts'],
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    '@typescript-eslint/brace-style': ['off', '1tbs', { allowSingleLine: true }],
    '@typescript-eslint/comma-dangle': ['warn', {
      arrays: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never',
      imports: 'always-multiline',
      objects: 'always-multiline',
    }],
    '@typescript-eslint/indent': ['warn', 2, { SwitchCase: 0 }],
    '@typescript-eslint/lines-between-class-members': ['error', 'always', {
      exceptAfterSingleLine: true,
    }],
    '@typescript-eslint/naming-convention': ['warn', {
      selector: 'default',
      format: ['camelCase'],
      leadingUnderscore: 'allow',
      trailingUnderscore: 'allow',
    }, {
      selector: 'typeLike',
      format: ['PascalCase'],
    }, {
      selector: 'classProperty',
      modifiers: ['static', 'readonly', 'public'],
      format: ['UPPER_CASE'],
    }],
    '@typescript-eslint/no-extra-parens': [
      'error',
      'all',
      {
        conditionalAssign: false,
        enforceForArrowConditionals: false,
        enforceForFunctionPrototypeMethods: false,
        enforceForNewInMemberExpressions: false,
        enforceForSequenceExpressions: false,
        ignoreJSX: 'multi-line',
        nestedBinaryExpressions: false,
        returnAssign: false,
      },
    ],
    '@typescript-eslint/no-magic-numbers': ['off', { ignore: [-2, -1, 0, 1, 2, 1000] }],
    '@typescript-eslint/no-type-alias': ['warn', {
      allowAliases: 'always',
      allowLiterals: 'in-unions-and-intersections',
    }],
    '@typescript-eslint/no-unnecessary-type-arguments': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', {
      args: 'after-used',
      argsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
    '@typescript-eslint/object-curly-spacing': ['warn', 'always', {
      arraysInObjects: true,
      objectsInObjects: false,
    }],
    '@typescript-eslint/prefer-readonly-parameter-types': 'off',
    '@typescript-eslint/quotes': ['warn', 'single', { avoidEscape: true }],
    '@typescript-eslint/return-await': ['warn', 'always'],
    '@typescript-eslint/strict-boolean-expressions': 'off',
    'max-params': ['warn', 5],
    'node/no-missing-import': ['error', {
      tryExtensions: ['.d.ts', '.js', '.json', '.node', '.ts'],
    }],
    'node/no-unsupported-features/es-syntax': 'off',
    'valid-jsdoc': 'off',
  },
};
