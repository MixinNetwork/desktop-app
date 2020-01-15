import Vue from 'vue'
import PostViewer from './PostViewer.vue'

PostViewer.newInstance = (props = {}) => {
  const Instance = new Vue({
    render(h) {
      return h(
        'div',
        {
          class: 'vue-post-viewer'
        },
        [
          h(PostViewer, {
            props
          })
        ]
      )
    }
  })

  const component = Instance.$mount()
  document.body.appendChild(component.$el)
  const postViewer = Instance.$children[0]

  return {
    visible(val) {
      postViewer.visible = !!val
      return this
    },
    setPost(data) {
      if (data) postViewer.post = data
      return this
    },
    component: postViewer
  }
}

let postViewerInstance = null
const getPostViewerInstance = props => {
  postViewerInstance = postViewerInstance || PostViewer.newInstance(props)
  return postViewerInstance
}

getPostViewerInstance()

PostViewer.show = () => {
  getPostViewerInstance().visible(true)
}
PostViewer.hide = () => {
  getPostViewerInstance().visible(false)
}
PostViewer.setPost = data => {
  getPostViewerInstance().setPost(data)
}

export default {
  install(Vue) {
    Vue.component('postViewer', PostViewer)
    Vue.prototype.$postViewer = PostViewer
  }
}
