module.exports = {
  css: {
    loaderOptions: {
      sass: {
        data: `
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
      externals: ['better-sqlite3'],
      nodeModulesPath: ['../../node_modules', './node_modules'],
      builderOptions: {
        productName: 'Mixin',
        appId: 'one.mixin.messenger',
        copyright: 'Copyright © 2019 Mixin Team',
        mac: {
          category: 'public.app-category.social-networking'
        }
      }
    }
  },

  lintOnSave: undefined
}
