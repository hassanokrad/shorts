module.exports = {
  root: false,
  env: {
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  extends: ['eslint:recommended'],
  ignorePatterns: ['dist', '.next', 'node_modules']
};
