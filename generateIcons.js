const execa = require('execa')
const fs = require('fs-extra')
const path = require('path')

execa('electron-icon-maker', ['--input=./icon.png', '--output=./build'], {
  stdio: 'inherit'
})
  .then(() => {
    fs.readdirSync('./build/icons/png').forEach(file => {
      fs.copyFileSync(
        path.join('./build/icons/png', file),
        path.join('./build/icons', file)
      )
    })
    fs.copyFileSync('./build/icons/win/icon.ico', './build/icons/icon.ico')
    fs.copyFileSync('./build/icons/mac/icon.icns', './build/icons/icon.icns')
    fs.removeSync('./build/icons/win')
    fs.removeSync('./build/icons/mac')
    fs.removeSync('./build/icons/png')
  })
  .catch(err => {
    throw new Error(err)
  })
