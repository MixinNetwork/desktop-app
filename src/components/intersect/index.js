const defaultConfig = {
  threshold: 0,
  root: null,
  rootMargin: '0px'
}

function except(object, keys) {
  return Object.keys(object).reduce((reduced, key) => {
    if (!keys.includes(key)) {
      reduced[key] = object[key]
    }
    return reduced
  }, {})
}

function parseIntersectValue(value) {
  return typeof value === 'function'
    ? Object.assign({}, defaultConfig, { callback: value })
    : Object.assign({}, defaultConfig, value)
}

export default {
  install(Vue, options) {
    const observerMap = {}
    Vue.directive('intersect', {
      inserted(el, {value}) {
        const config = parseIntersectValue(value)

        const observer = new IntersectionObserver(([entry]) => {
          config.callback(entry)
        }, except(config, ['callback']))

        observer.observe(el)
        observerMap[el.id] = observer
      },
      unbind(el) {
        if (observerMap[el.id]) {
          observerMap[el.id].disconnect()
        }
        delete observerMap[el.id]
      }
    })
  }
}