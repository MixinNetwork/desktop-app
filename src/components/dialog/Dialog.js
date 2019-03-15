import Template from './Dialog.vue'

let globalOptions = {
  show: false,
  closable: true,
  title: {
    content: ''
  },
  message: {
    content: ''
  }
}

let instance

const Dialog = function(config = {}) {
  let Tpl = this.extend(Template)
  instance = new Tpl()
  config = {
    ...globalOptions,
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

const Alert = function(message, positiveTitle, positiveCallback, negativeTitle, negativeCallback) {
  let alertConfig = {
    type: 'info',
    title: {
      content: null
    },
    message: {
      content: message
    },
    buttons: {
      negative: {
        title: negativeTitle,
        callback: () => {
          Dismiss()
          negativeCallback()
        }
      },
      positive: {
        title: positiveTitle,
        callback: () => {
          Dismiss()
          positiveCallback()
        }
      }
    }
  }

  Dialog.call(this, {
    ...globalOptions,
    ...alertConfig
  })
}

const Options = function(title, options, positiveTitle, positiveCallback, negativeTitle, negativeCallback) {
  let alertConfig = {
    type: 'info',
    title: {
      content: title
    },
    options: options,
    buttons: {
      negative: {
        title: negativeTitle,
        callback: () => {
          Dismiss()
          negativeCallback()
        }
      },
      positive: {
        title: positiveTitle,
        callback: picked => {
          Dismiss()
          positiveCallback(picked)
        }
      }
    }
  }

  Dialog.call(this, {
    ...globalOptions,
    ...alertConfig
  })
}

const Dismiss = () => {
  instance.$data.show = false
  document.body.style.overflow = 'auto'
}

export default {
  install(Vue) {
    Vue.prototype.$Dialog = Dialog.bind(Vue)
    Vue.prototype.$Dialog.alert = Alert.bind(Vue)
    Vue.prototype.$Dialog.options = Options.bind(Vue)
    Vue.prototype.$Dialog['dismiss'] = Dismiss
  }
}
