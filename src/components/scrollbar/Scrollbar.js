import Scrollbar from './Scrollbar.vue'

const install = (Vue, options) => {
  if (options) {
    Scrollbar.props.globalOptions.default = () => options
  }
  Vue.component(Scrollbar.name, Scrollbar)
}

const MixinScrollbar = { install }

export default MixinScrollbar
export { Scrollbar }
