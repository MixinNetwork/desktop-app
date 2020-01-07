import Vue from 'vue'
import VueElectron from 'vue-electron'
import App from './App.vue'
import router from './router'
import store from './store/store'
import axios from 'axios'
import VueAxios from 'vue-axios'
import Dialog from '@/components/dialog/Dialog'
import Menu from '@/components/menu/Menu'
import ImageViewer from '@/components/image-viewer/ImageViewer'
import Scrollbar from '@/components/scrollbar/Scrollbar'
import Toast from '@/components/toast/Toast'
import { library } from '@fortawesome/fontawesome-svg-core'
import blaze from '@/blaze/blaze'
import i18n from '@/utils/i18n'
import moment from 'moment'
import { faArrowLeft, faArrowRight, faChevronDown, faSearch } from '@fortawesome/free-solid-svg-icons'
import { faPaperPlane } from '@fortawesome/free-regular-svg-icons'
import { API_URL } from '@/utils/constants'

const fontawesome = require('@fortawesome/vue-fontawesome')
library.add(faArrowLeft, faArrowRight, faChevronDown, faSearch, faPaperPlane)

Vue.use(VueAxios, axios)
Vue.use(VueElectron)
Vue.use(Dialog)
Vue.use(Menu)
Vue.use(Toast)
Vue.use(ImageViewer)
Vue.use(Scrollbar)

Vue.axios.defaults.baseURL = API_URL.HTTP
Vue.axios.defaults.headers.post['Content-Type'] = 'application/json'
Vue.component('font-awesome-icon', fontawesome.FontAwesomeIcon)
Vue.config.productionTip = false
Vue.prototype.$blaze = blaze
moment.locale(navigator.language)
Vue.prototype.$moment = moment

new Vue({
  i18n,
  router,
  store,
  render: h => h(App)
}).$mount('#app')
