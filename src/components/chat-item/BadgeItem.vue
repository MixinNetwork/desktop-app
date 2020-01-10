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
            <font-awesome-icon class="down" icon="chevron-down" />
          </a>
        </transition>
      </a>
    </span>
    <slot></slot>
  </span>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component
export default class BadgeItem extends Vue {
  @Prop(String) readonly type: any
  @Prop(Boolean) readonly send: any
  @Prop(Boolean) readonly quote: any

  focus: Boolean = false
  show: Boolean = false

  enter() {
    this.show = true
  }
  leave() {
    this.show = false
  }
  onFocus() {
    this.focus = true
  }
  onBlur() {
    this.focus = false
  }

  get shadowStyle() {
    const style: any = {}
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
          style.width = '2.5rem'
          style.background = `linear-gradient(20deg,rgba(0, 0, 0, 0) 0%,rgba(255, 255, 255, 1)  50%,rgba(255, 255, 255, 1) 100%`
        }
      }
    } else if (this.type.endsWith('_IMAGE') || this.type.endsWith('_LIVE')) {
      style.right = '0.8rem'
      style.width = '100px'
      style.background = `linear-gradient(20deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
    } else if (this.type.startsWith('APP_BUTTON')) {
      style.width = '35px'
      style.height = '16px'
      style.padding = '0 2px'
      style.background = `linear-gradient(26deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
    } else {
      style.width = '100px'
      style.background = `linear-gradient(20deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
    }
    return style
  }
  get iconStyle() {
    const color: any = { color: 'white' }
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
}
</script>

<style lang="scss" scoped>
.layout {
  position: relative;
  .shadow {
    position: absolute;
    right: 0;
    border-top-right-radius: 0.3rem;
    z-index: 1;
    height: 2rem;
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-start;
    align-items: center;
    padding-right: 0.5rem;
    pointer-events: none;
  }
  .badge {
    pointer-events: auto;
    a {
      display: inline-block;
      vertical-align: top;
      line-height: .8rem;
    }
  }
}
</style>
