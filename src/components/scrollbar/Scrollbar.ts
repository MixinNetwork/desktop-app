import Scrollbar from './Scrollbar.vue'

const install = (Vue: any, options: any) => {
  if (options) {
    // @ts-ignore
    Scrollbar.props.globalOptions.default = () => options
  }
  Vue.component('mixin-scrollbar', Scrollbar)
}

const MixinScrollbar = { install }

export default MixinScrollbar
export { Scrollbar }
