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
    'object-curly-newline': 'off',
    'object-curly-spacing': 'off',
    'object-property-newline': 'off',
    'space-before-function-paren': ['error', 'never'],
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'eol-last': 'off',
    'object-curly-newline': ['error', { ExportDeclaration: { multiline: true, minProperties: 3 } }]
  },
  parserOptions: {
    parser: 'babel-eslint'
  }
}
