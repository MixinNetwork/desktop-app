import Tribute from './Tribute'

const VueTribute = {
  name: 'vue-tribute',
  props: {
    options: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      tributeOptions: {
        trigger: '@',
        iframe: null,
        selectClass: 'highlight',
        containerClass: 'tribute-container',
        itemClass: '',
        selectTemplate: function(item) {
          return `<b class="highlight default" contenteditable="false">@${item.original.id}</b>`
        },
        menuItemTemplate: function(item) {
          return item.string
        },
        noMatchTemplate: null,
        menuContainer: document.body,
        lookup(item, mentionText) {
          return `<div>${item.name}</div><div>${item.id}</div>`
        },
        fillAttr: 'id',
        values: [],
        loadingItemTemplate: null,
        requireLeadingSpace: true,
        allowSpaces: false,
        // replaceTextSuffix: '\n',
        positionMenu: true,
        spaceSelectsMatch: false,
        autocompleteMode: false,
        searchOpts: {
          pre: '<span>',
          post: '</span>',
          skip: false
        },
        menuItemLimit: 25,
        menuShowMinLength: 0
      }
    }
  },
  watch: {
    options: {
      immediate: false,
      deep: true,
      handler() {
        if (this.tribute) {
          setTimeout(() => {
            var $el = this.$slots.default[0].elm
            this.tribute.detach($el)

            setTimeout(() => {
              $el = this.$slots.default[0].elm
              const options = Object.assign(this.tributeOptions, this.options)
              this.tribute = new Tribute(options)
              this.tribute.attach($el)
              $el.tributeInstance = this.tribute
            }, 0)
          }, 0)
        }
      }
    }
  },
  mounted() {
    if (typeof Tribute === 'undefined') {
      throw new Error('[vue-tribute] cannot locate tributejs!')
    }

    const $el = this.$slots.default[0].elm

    const options = Object.assign(this.tributeOptions, this.options)
    this.tribute = new Tribute(options)

    this.tribute.attach($el)

    $el.tributeInstance = this.tribute

    $el.addEventListener('tribute-replaced', e => {
      e.target.dispatchEvent(new Event('input', { bubbles: true }))
    })
  },
  beforeDestroy() {
    const $el = this.$slots.default[0].elm

    if (this.tribute) {
      this.tribute.detach($el)
    }
  },
  render(h) {
    return h(
      'div',
      {
        staticClass: 'v-tribute'
      },
      this.$slots.default
    )
  }
}

if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.component(VueTribute.name, VueTribute)
}

export default VueTribute
