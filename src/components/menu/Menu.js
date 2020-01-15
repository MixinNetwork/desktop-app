import Template from './Menu.vue'

let instance

const Menu = function(config = {}) {
  let Tpl = this.extend(Template)
  instance = new Tpl()
  config = {
    ...config
  }
  for (let key in config) {
    if (config.hasOwnProperty(key)) {
      instance.$data[key] = config[key]
    }
  }
  instance.$data.show = true
  document.body.style.overflow = 'hidden'
  document.body.appendChild(instance.$mount().$el)
}

const Alert = function(x, y, menus, onItemClick) {
  let menuHeight = menus.length * 42 + 16
  let bottom = y
  if (menuHeight + y > window.innerHeight) {
    bottom = y - menuHeight
  }
  Menu.call(this, {
    x: x,
    y: bottom,
    menus: menus,
    onItemClick: index => {
      onItemClick(index)
      Dismiss()
    }
  })
}

const Dismiss = () => {
  instance.$data.show = false
  document.body.style.overflow = 'auto'
}

export default {
  install(Vue) {
    Vue.prototype.$Menu = Menu.bind(Vue)
    Vue.prototype.$Menu.alert = Alert.bind(Vue)
    Vue.prototype.$Menu['dismiss'] = Dismiss
  }
}
