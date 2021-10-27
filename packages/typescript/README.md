## SublimeLinter-eslint and typescript
In SublimeText, to enable "TypeScript auto detection" of the SublimeLinter-eslint plugin, you MUST to have `@typescript-eslint/parser` in the `dependencies` or `devDependencies` of your local `package.json` file.
This is the reason why I put `@typescript-eslint/parser` in `peerDependencies` section instead of `dependencies`.
