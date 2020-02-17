const path = require('path')

function resolve(dir) {
  return path.join(__dirname, dir)
}

module.exports = {
  css: {
    loaderOptions: {
      sass: {
        prependData: `
          @import "@/assets/scss/_variables.scss";
        `
      }
    }
  },
  chainWebpack: config => {
    config.module
      .rule('svg')
      .exclude
      .add(resolve('src/assets/images'))
      .end()
    config.module
      .rule('svg1')
      .test(/\.svg$/)
      .use('svg-sprite')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end()
      .include
      .add(resolve('src/assets/images'))
      .end()
  },
  pluginOptions: {
    electronBuilder: {
      externals: ['better-sqlite3', 'bytebuffer'],
      nodeModulesPath: ['../../node_modules', './node_modules'],
      builderOptions: {
        productName: 'Mixin',
        appId: 'one.mixin.messenger',
        copyright: 'Copyright © 2020 Mixin Team',
        mac: {
          category: 'public.app-category.social-networking',
          target: [
            {
              target: 'default',
              arch: ['x64']
            },
            {
              target: 'pkg',
              arch: ['x64']
            }
          ]
        },
        afterSign: 'scripts/notarize',
        linux: {
          executableName: 'mixin-desktop'
        },
        appx: {
          displayName: 'Mixin Desktop'
        },
        win: {
          target: [
            {
              target: 'nsis',
              arch: ['x64']
            },
            {
              target: 'msi',
              arch: ['x64']
            },
            {
              target: 'appx',
              arch: ['x64']
            }
          ]
        }
      }
    }
  },

  lintOnSave: true
}
