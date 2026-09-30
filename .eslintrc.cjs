// Lint gate for CI (npm run lint). Errors fail the build; the pre-existing
// style issues below stay visible as warnings until those files are touched.
module.exports = {
  root: true,
  extends: ['react-app'],
  ignorePatterns: ['dist/', 'node_modules/', 'plugins/', 'tools/', 'api/', 'contracts/'],
  rules: {
    'import/first': 'warn',
    'no-restricted-globals': 'warn',
  },
  overrides: [
    // `useSuggestion` is a plain click handler, not a hook (rules-of-hooks
    // goes by the name only).
    { files: ['src/components/CreatorStudio/StoreTab.jsx'], rules: { 'react-hooks/rules-of-hooks': 'off' } },
    {
      files: ['src/**/*.test.{js,jsx}', 'src/test/**'],
      globals: { vi: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' },
    },
  ],
};
