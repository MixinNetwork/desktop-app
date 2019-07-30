import Vue from 'vue'
import VueElectron from 'vue-electron'
import App from './App.vue'
import router from './router'
import store from './store/store'
import axios from 'axios'
import VueAxios from 'vue-axios'
import VueLazyload from 'vue-lazyload'
import Dialog from '@/components/dialog/Dialog.js'
import Menu from '@/components/menu/Menu.js'
import ImageViewer from '@/components/image-viewer/ImageViewer.js'
import Toast from '@/components/toast/Toast.js'
import { library } from '@fortawesome/fontawesome-svg-core'
import blaze from '@/blaze/blaze'
import i18n from '@/utils/i18n.js'
import { faArrowLeft, faArrowRight, faChevronDown, faSearch } from '@fortawesome/free-solid-svg-icons'
import { faPaperPlane } from '@fortawesome/free-regular-svg-icons'

const fontawesome = require('@fortawesome/vue-fontawesome')
library.add(faArrowLeft, faArrowRight, faChevronDown, faSearch, faPaperPlane)

Vue.use(VueAxios, axios)
Vue.use(VueLazyload)
Vue.use(VueElectron)
Vue.use(Dialog)
Vue.use(Menu)
Vue.use(Toast)
Vue.use(ImageViewer)

Vue.axios.defaults.baseURL = 'https://api.mixin.one/'
Vue.axios.defaults.headers.post['Content-Type'] = 'application/json'
Vue.component('font-awesome-icon', fontawesome.FontAwesomeIcon)
Vue.config.productionTip = false
Vue.prototype.$blaze = blaze

new Vue({
  i18n,
  router,
  store,
  render: h => h(App),
  mounted() {
    // Prevent blank screen in Electron builds
    this.$router.push('/')
  }
}).$mount('#app')
