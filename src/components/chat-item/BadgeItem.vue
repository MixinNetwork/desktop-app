<template>
  <span class="layout" @mouseenter="enter" @mouseleave="leave">
    <span class="shadow" :style="shadowStyle" v-show="show|focus">
      <a class="badge" href="javascript:void(0)">
        <transition name="slide-right">
          <a
            @click="$emit('handleMenuClick')"
            @focus="onFocus"
            @blur="onBlur"
            href="javascript:void(0)"
            :style="iconStyle"
          >
            <font-awesome-icon class="down" icon="chevron-down"/>
          </a>
        </transition>
      </a>
    </span>
    <slot></slot>
  </span>
</template>

<script>
export default {
  props: ['type', 'send', 'quote'],
  data: function() {
    return {
      focus: false,
      show: false
    }
  },
  computed: {
    shadowStyle() {
      const style = {}
      if (this.type === 'MESSAGE_RECALL' || this.type.endsWith('_TEXT')) {
        if (this.send) {
          style.right = '0.8rem'
          if (this.quote) {
            style.width = '100px'
            style.background = `linear-gradient(20deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
          } else {
            style.width = '56px'
            style.background = `linear-gradient(20deg,rgba(0, 0, 0, 0) 0%,rgba(197, 237, 255, 1) 50%,rgba(197, 237, 255, 1) 100%`
          }
        } else {
          if (this.quote) {
            style.width = '100px'
            style.background = `linear-gradient(20deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
          } else {
            style.width = '40px'
            style.background = `linear-gradient(20deg,rgba(0, 0, 0, 0) 0%,rgba(255, 255, 255, 1)  50%,rgba(255, 255, 255, 1) 100%`
          }
        }
      } else if (this.type.endsWith('_IMAGE')) {
        style.right = '0.8rem'
        style.width = '100px'
        style.background = `linear-gradient(20deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
      } else {
        style.width = '100px'
        style.background = `linear-gradient(20deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
      }
      return style
    },
    iconStyle() {
      const color = { color: 'white' }
      if (this.type === 'MESSAGE_RECALL' || this.type.endsWith('_TEXT')) {
        if (this.send) {
          color.right = '0.8rem'
          if (this.quote) {
            color.color = 'white'
          } else {
            color.color = '#8799a5'
          }
        } else {
          if (this.quote) {
            color.color = 'white'
          } else {
            color.color = '#8799a5'
          }
        }
      }
      return color
    }
  },
  methods: {
    enter() {
      this.show = true
    },
    leave() {
      this.show = false
    },
    onFocus() {
      this.focus = true
    },
    onBlur() {
      this.focus = false
    }
  }
}
</script>

<style lang="scss" scoped>
.layout {
  position: relative;
  .shadow {
    position: absolute;
    right: 0px;
    border-top-right-radius: 0.3rem;
    z-index: 1;
    height: 32px;
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-start;
    align-items: center;
    padding-right: 8px;
  }
}
</style>
