import './tribute.scss'
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
          if (!item) return ''
          return `<b class="highlight default" contenteditable="false">@${item.original.id}</b>`
        },
        menuItemTemplate: function(item) {
          if (!item) return ''
          const list = item.string.split('\n')
          return `<div>${list[0]}</div><div>${list[1]}</div>`
        },
        noMatchTemplate: null,
        menuContainer: document.body,
        lookup(item, mentionText) {
          return `${item.name}\n${item.id}`
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
        menuItemLimit: 256,
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
  methods: {
    selectItem(index, event) {
      this.tribute.selectItemAtIndex(index, event)
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

    $el.addEventListener('tribute-items', e => {
      const items = []
      e.detail.forEach(item => {
        if (item.string) {
          const list = item.string.split('\n')
          list.push(list[1].replace(/<[^>]+>/g, ''))
          items.push(list)
        }
      })
      this.$emit('update', items)
    })
    $el.addEventListener('tribute-replaced', e => {
      if (e.detail.item) {
        const item = e.detail.item.string.split('\n')
        this.$emit('choose', item)
      }
    })
    $el.addEventListener('tribute-select-index', e => {
      const index = e.detail
      this.$emit('select-index', index)
    })
    $el.addEventListener('tribute-active-true', e => {
      this.$emit('open')
    })
    $el.addEventListener('tribute-active-false', e => {
      this.$emit('close')
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
