module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: ['plugin:vue/essential', '@vue/standard'],
  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    'generator-star-spacing': 'off',
    'no-trailing-spaces': 'off',
    'no-multiple-empty-lines': 'off',
    'space-before-function-paren': 'off',
    indent: 'off',
    'eol-last': 'off',
    'object-curly-newline': ['error', { ExportDeclaration: { multiline: true, minProperties: 3 } }],
    semi: 'off',
    'no-inner-declarations': 'off',
    'no-irregular-whitespace': 'off',
    'no-unused-vars': 'off',
    quotes: 'off'
  },
  parserOptions: {
    parser: 'babel-eslint'
  }
}
