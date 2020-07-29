import Vue from 'vue'
import electron from 'electron'
import App from './App.vue'
import router from './router'
import store from './store/store'
import axios from 'axios'
import VueAxios from 'vue-axios'
import Dialog from '@/components/dialog/Dialog'
import Menu from '@/components/menu/Menu'
import ImageViewer from '@/components/image-viewer/ImageViewer'
import Scrollbar from '@/components/scrollbar/Scrollbar'
import PostViewer from '@/components/post-viewer/PostViewer'
import Circles from '@/components/circles/Circles'
import Toast from '@/components/toast/Toast'
import { library } from '@fortawesome/fontawesome-svg-core'
import blaze from '@/blaze/blaze'
import i18n from '@/utils/i18n'
import moment from 'moment'
import { faArrowLeft, faArrowRight, faChevronDown, faSearch } from '@fortawesome/free-solid-svg-icons'
import { faPaperPlane } from '@fortawesome/free-regular-svg-icons'
import Markdown from '@/components/markdown'
import Wrapper from '@/components/markdown/wrapper'
import VueIntersect from '@/components/intersect'
import VueTitlebar from '@/components/titlebar/index'
import VideoPlayer from '@/components/video-player'
// @ts-ignore
import VueVirtualScroller from 'vue-virtual-scroller'

import 'highlight.js/styles/default.css'
import './assets/index'
// import 'video.js/dist/video-js.css'
import '@/components/video-player/video.scss'

const fontawesome = require('@fortawesome/vue-fontawesome')
library.add(faArrowLeft, faArrowRight, faChevronDown, faSearch, faPaperPlane)

Vue.use(VueAxios, axios)
Vue.use(Dialog)
Vue.use(Menu)
Vue.use(Toast)
Vue.use(ImageViewer)
Vue.use(Scrollbar)
Vue.use(PostViewer)
Vue.use(Circles)
Vue.use(Markdown)
Vue.use(Wrapper)
Vue.use(VueIntersect)
Vue.use(VueTitlebar)
Vue.use(VideoPlayer)
Vue.use(VueVirtualScroller)

Vue.component('font-awesome-icon', fontawesome.FontAwesomeIcon)
Vue.config.productionTip = false
Vue.config.devtools = false
// console.log(__VUE_DEVTOOLS_GLOBAL_HOOK__)

Vue.prototype.$blaze = blaze
moment.locale(navigator.language)
Vue.prototype.$moment = moment
Vue.prototype.$electron = electron
let mouseMoveFlag = false
document.onmousedown = () => {
  Vue.prototype.$selectNes = null
  mouseMoveFlag = true
  setTimeout(() => {
    if (mouseMoveFlag) {
      Vue.prototype.$selectNes = document.getSelection()
    } else {
      Vue.prototype.$selectNes = null
    }
  }, 30)
}
document.onmouseup = () => {
  const selectNes = document.getSelection()
  // @ts-ignore
  if (selectNes && selectNes.baseOffset !== selectNes.extentOffset) {
    mouseMoveFlag = true
  } else {
    mouseMoveFlag = false
  }
}

new Vue({
  i18n,
  router,
  store,
  render: h => h(App)
}).$mount('#app')
