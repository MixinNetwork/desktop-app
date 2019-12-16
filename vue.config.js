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
    const svgRule = config.module.rule('svg')
    svgRule.uses.clear()
    svgRule.use('vue-svg-loader').loader('vue-svg-loader')
  },
  pluginOptions: {
    electronBuilder: {
      externals: ['better-sqlite3', 'bytebuffer'],
      nodeModulesPath: ['../../node_modules', './node_modules'],
      builderOptions: {
        productName: 'Mixin',
        appId: 'one.mixin.messenger',
        copyright: 'Copyright © 2019 Mixin Team',
        mac: {
          category: 'public.app-category.social-networking'
        },
        linux: {
          executableName: 'mixin-desktop'
        },
        win: {
          target: [
            {
              target: 'nsis',
              arch: ['x64']
            }
          ]
        }
      }
    }
  },

  lintOnSave: true
}
