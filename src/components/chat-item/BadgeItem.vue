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
            :style="color"
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
  props: ['type', 'send'],
  data: function() {
    return {
      focus: false,
      show: false
    }
  },
  computed: {
    shadowStyle() {
      const style = {}
      if (this.type === 'MESSAGE_RECALL') {
        if (this.send) {
          style.width = '40px'
          style.right = '0.8rem'
          style.background = '#c5edff'
        } else {
          style.width = '40px'
          style.background = 'white'
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
    style() {
      // {if (this.type.endsWith('_STICKER')) {
      //   return {
      //     top: '8px',
      //     right: '8px'
      //   }
      // } else if (this.type.endsWith('_DATA') || this.type.endsWith('_CONTACT')) {
      //   return {
      //     top: '8px',
      //     right: '12px'
      //   }
      // } else if (this.type.endsWith('_VIDEO')) {
      //   return {
      //     top: '8px',
      //     right: '18px'
      //   }
      // } else if (this.type.endsWith('_AUDIO')) {
      //   return {
      //     top: '8px',
      //     right: '30px'
      //   }
      // } else if (this.type === 'MESSAGE_RECALL') {
      //   return {
      //     top: '3px',
      //     right: '3px'
      //   }
      // }}
      return {}
    },
    color() {
      if (this.type === 'MESSAGE_RECALL') {
        if (this.send) {
          return {
            right: '0.8rem',
            background: '#c5edff',
            color: '#8799a5'
          }
        } else {
          return {
            background: 'white',
            color: '#8799a5'
          }
        }
      }
      return {
        color: 'white'
      }
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
