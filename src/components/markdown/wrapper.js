import filter from './filter'

export default {
  install: function(Vue) {
    Object.defineProperty(Vue.prototype, '$w', {
      value: function(html) {
        return filter(html)
      }
    })
  }
}
