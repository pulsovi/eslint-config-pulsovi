# eslint-config-typescript
My eslint config for TypeScript projects

## installation

Add the dependency

`yarn add -D typescript eslint @typescript-eslint/parser`

Write eslint config file :

```yaml:.eslintrc.yml
extends: pulsovi-typescript
```

If your `tsconfig.json` file is not in the same folder with `.eslintrc.yml` and **all of your `.ts` files** you must use a `.js` file like this

```javascript:.eslintrc.js
/* eslint-disable sort-keys */
const path = require('path');

module.exports = {
  root: true,
  'extends': 'pulsovi-typescript',
  parserOptions: {
    project: path.resolve(__dirname, 'tsconfig.json'),
  },
};
```

## SublimeLinter-eslint and typescript
In SublimeText, to enable "TypeScript auto detection" of the SublimeLinter-eslint plugin, you MUST to have `@typescript-eslint/parser` in the `dependencies` or `devDependencies` of your local `package.json` file (see [the commit](https://github.com/SublimeLinter/SublimeLinter-eslint/commit/dd687aac465a012e88b000507c064f5a08119e40) and [the documentation](https://github.com/SublimeLinter/SublimeLinter-eslint#using-eslint-with-plugins-eg-vue)).
This is the reason why I put `@typescript-eslint/parser` in `peerDependencies` section instead of `dependencies`.

`typescript` is a peer dependency of `@typescript-eslint/parser` and must be provided in the same parent or more ancestor; since `@typescript-eslint/parser` is there in peer dependencies (see README.md), `typescript` must be too.
