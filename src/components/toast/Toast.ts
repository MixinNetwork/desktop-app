import vue from 'vue'
import Toast from './Toast.vue'

const ToastConstructor = vue.extend(Toast)

function showToast(text: any, duration = 2000) {
  const toastDom = new ToastConstructor({
    el: document.createElement('div'),
    data() {
      return {
        text: text,
        showWrap: true,
        showContent: true
      }
    }
  })
  document.body.appendChild(toastDom.$el)

  setTimeout(() => {
    toastDom.showContent = false
  }, duration - 1250)
  setTimeout(() => {
    toastDom.showWrap = false
  }, duration)
}

export default {
  install(Vue: any) {
    Vue.prototype.$toast = showToast
  }
}
