<template>
  <span class="layout" @mouseenter="enter" v-if="freeze">
    <span class="expand-icon" v-if="showExpand">
      <svg-icon icon-class="ic_expand" />
    </span>
    <slot></slot>
  </span>
  <span
    v-else
    class="layout"
    @mousemove="move"
    @mouseup="up"
    @mousedown="down"
    @mouseenter="enter"
    @mouseleave="leave"
  >
    <span class="expand-icon" v-if="showExpand">
      <svg-icon icon-class="ic_expand" />
    </span>
    <span class="shadow" :style="shadowStyle" v-show="show || focus">
      <a class="badge" href="javascript:void(0)">
        <transition name="slide-right">
          <a
            @click.stop="$emit('handleMenuClick')"
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
import { messageType } from '@/utils/constants'

@Component
export default class BadgeItem extends Vue {
  @Prop(String) readonly type: any
  @Prop(Boolean) readonly send: any
  @Prop(Boolean) readonly quote: any
  @Prop(Boolean) readonly isLongPicture: any

  focus: Boolean = false
  show: Boolean = false
  mouseDown: Boolean = false
  freeze: Boolean = true
  putExpand: Boolean = true

  get showExpand() {
    return this.messageType() === 'post' || this.isLongPicture
  }

  get shadowStyle() {
    const style: any = {}
    if (this.type === 'MESSAGE_RECALL' || this.messageType() === 'text') {
      if (this.send) {
        style.right = '0.6rem'
        if (this.quote) {
          style.width = '4rem'
          style.background = `linear-gradient(23deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
        } else {
          style.width = '5rem'
          style.background = `linear-gradient(23deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 55%,rgba(197, 237, 255, 1) 65%,rgba(197, 237, 255, 1) 100%`
        }
      } else {
        if (this.quote) {
          style.width = '4rem'
          style.background = `linear-gradient(23deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
        } else {
          style.width = '5rem'
          style.background = `linear-gradient(23deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 55%,rgba(255, 255, 255, 1) 65%,rgba(255, 255, 255, 1) 100%`
        }
      }
    } else if (this.messageType() === 'image' || this.messageType() === 'live') {
      style.width = '4rem'
      style.background = `linear-gradient(23deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
    } else if (this.messageType() === 'app_button_group') {
      style.width = '1.74rem'
      style.height = '0.8rem'
      style.padding = '0.2rem 0.1rem'
      style.background = `linear-gradient(26deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
    } else {
      style.width = '4rem'
      style.background = `linear-gradient(23deg,rgba(0, 0, 0, 0) 0%,rgba(0, 0, 0, 0) 50%,rgba(0, 0, 0, 0.45) 100%`
    }
    return style
  }
  get iconStyle() {
    const color: any = { color: 'white' }
    if (this.type === 'MESSAGE_RECALL' || this.messageType() === 'text') {
      if (this.send) {
        color.right = '0.6rem'
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
  down() {
    this.mouseDown = true
  }
  up() {
    this.mouseDown = false
    this.show = true
  }
  move() {
    if (this.mouseDown) {
      this.show = false
    }
  }
  enter() {
    if (this.freeze) {
      this.freeze = false
    }
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

  messageType() {
    return messageType(this.type)
  }
}
</script>

<style lang="scss" scoped>
.layout {
  position: relative;
  z-index: 0;
  .expand-icon {
    position: absolute;
    right: 0.35rem;
    top: 0.25rem;
    z-index: 100;
  }
  .shadow {
    position: absolute;
    right: 0;
    border-top-right-radius: 0.2rem;
    z-index: 100;
    height: 1.6rem;
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-start;
    align-items: center;
    padding-right: 0.4rem;
    pointer-events: none;
  }
  .badge {
    pointer-events: auto;
    a {
      display: inline-block;
      vertical-align: top;
      line-height: 0.6rem;
    }
  }
  .down {
    margin-top: -0.2rem;
  }
}
</style>
