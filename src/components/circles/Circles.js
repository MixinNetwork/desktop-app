import Vue from 'vue'
import Circles from './Circles.vue'

Circles.newInstance = (props = {}) => {
  const Instance = new Vue({
    render(h) {
      return h(
        'div',
        {
          class: 'vue-circles'
        },
        [
          h(Circles, {
            props
          })
        ]
      )
    }
  })

  const component = Instance.$mount()
  document.body.appendChild(component.$el)
  const circles = Instance.$children[0]

  return {
    visible(val) {
      circles.visible = !!val
      return this
    },
    editCircle(circle) {
      circles.visible = true
      setTimeout(() => {
        circles.beforeEditCircle(circle)
        circles.editCircle()
      })
      return this
    },
    component: circles
  }
}

let circlesInstance = null
const getCirclesInstance = props => {
  circlesInstance = circlesInstance || Circles.newInstance(props)
  return circlesInstance
}

getCirclesInstance()

Circles.show = () => {
  getCirclesInstance().visible(true)
}
Circles.hide = () => {
  getCirclesInstance().visible(false)
}
Circles.addConversations = circle => {
  getCirclesInstance().editCircle(circle)
}

export default {
  install(Vue) {
    Vue.component('circles', Circles)
    Vue.prototype.$circles = Circles
  }
}
