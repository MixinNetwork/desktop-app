module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: ['plugin:vue/essential', '@vue/standard'],
  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    'space-before-function-paren': 0
  },
  parserOptions: {
    parser: 'babel-eslint'
  }
}
