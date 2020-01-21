<template>
  <div ref="scroll" class="mixin-scrollbar">
    <slot />
    <div class="scrollbar-track" @mouseover="trackHover(true)" @mouseout="trackHover(false)"></div>
    <div
      class="scrollbar-thumb"
      :class="{dragging}"
      @mouseover="thumbMouseOver"
      @mouseout="thumbMouseOut"
      @mousedown="thumbMouseDown"
      v-show="thumbShowForce && showScroll"
      :style="{
        opacity: thumbShow ? 1 : 0,
        transform: `translate3d(0, ${thumbTop}px, 0)`,
        height: thumbHeight + 'px',
        transition: showScroll ? 'transform 0.05s ease-out, width 0.15s, opacity 0.5s, height 0.55s' : ''
      }"
    ></div>
  </div>
</template>

<script lang="ts">
import { Vue, Prop, Watch, Component } from 'vue-property-decorator'

@Component({
  name: 'mixin-scrollbar'
})
export default class MixinScrollbar extends Vue {
  @Prop(Boolean) readonly goBottom: any
  @Prop(Boolean) readonly isBottom: any
  @Prop(Boolean) readonly showScroll: any
  @Prop(Object) readonly globalOptions: any
  @Prop(Object) readonly options: any

  scrollBox: any = null
  scrollThumb: any = null
  goBottomTimeout: any = null
  thumbShowTimeout: any = null
  thumbTop: any = 0
  thumbHeight: any = 25
  thumbShow: any = false
  thumbShowForce: any = true
  thumbShowLock: any = false
  tempThumb: any = {
    top: 0,
    y: 0
  }
  dragging: any = false

  @Watch('goBottom')
  onGoBottomChange() {
    this.thumbShowForce = false
    this.thumbShow = false
    this.thumbShowLock = true
    clearTimeout(this.goBottomTimeout)
    this.goBottomTimeout = setTimeout(() => {
      this.thumbShowForce = true
      this.thumbShowLock = false
    }, 500)
  }

  scroll() {
    const scrollBox = this.scrollBox
    scrollBox.onscroll = (e: any) => {
      if (!this.thumbShowLock && !this.thumbShow) {
        this.thumbShow = true
      }
      if (this.thumbShow) {
        clearTimeout(this.thumbShowTimeout)
        this.thumbShowTimeout = setTimeout(() => {
          if (!this.thumbShowLock) {
            this.thumbShow = false
          }
        }, 1000)
      }
      this.thumbHeight = (scrollBox.clientHeight / scrollBox.scrollHeight) * scrollBox.clientHeight
      const maxScrollTop = scrollBox.scrollHeight - scrollBox.clientHeight
      let thumbTop: number = (scrollBox.scrollTop * (scrollBox.clientHeight - this.thumbHeight)) / maxScrollTop
      if (thumbTop > scrollBox.clientHeight - this.thumbHeight - 25) {
        thumbTop = Math.floor(thumbTop)
      }
      if (this.thumbHeight < 25) {
        thumbTop -= 25 - this.thumbHeight
      }
      this.thumbTop = thumbTop
      if (this.thumbTop < 0 || scrollBox.clientHeight >= scrollBox.scrollHeight) {
        this.thumbTop = 0
      }
    }
  }
  thumbMouseOver() {
    if (this.dragging) return
    this.thumbShow = true
    this.thumbShowLock = true
  }
  thumbMouseOut() {
    if (this.dragging) return
    this.thumbShowLock = false
    this.thumbShow = false
  }
  thumbMouseDown(e: any) {
    this.dragging = true
    this.tempThumb = {
      top: this.thumbTop,
      y: e.clientY
    }

    document.onmousemove = event => {
      if (!this.dragging) return
      const offest = event.clientY - this.tempThumb.y
      const scrollBox = this.scrollBox
      const maxScrollTop = scrollBox.scrollHeight - scrollBox.clientHeight
      scrollBox.scrollTop =
          ((this.tempThumb.top + offest) / (scrollBox.clientHeight - this.thumbHeight)) * maxScrollTop
    }
    document.onmouseup = () => {
      this.dragging = false
      this.thumbMouseOut()
    }
  }
  trackHover(flag: any) {
    if (this.dragging) return
    this.thumbShow = flag
  }

  querySelector(selector: string) {
    // @ts-ignore
    return this.$refs.scroll.querySelector(selector)
  }

  mounted() {
    this.scrollBox = this.querySelector('.ul')
    if (!this.scrollBox) {
      this.scrollBox = this.querySelector('ul')
    }
    this.scrollThumb = this.querySelector('.scrollbar-thumb')

    this.scroll()

    this.$emit('init', this.scrollBox)
  }
  destroyed() {
    this.scrollBox = null
    this.scrollThumb = null
  }
}
</script>

<style lang="scss">
.mixin-scrollbar {
  position: relative;
  width: 100%;
  height: 100%;

  overflow: hidden;
  flex: 1 0 0;
  & > ul,
  & > .ul {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }
  &::-webkit-scrollbar,
  & > ul::-webkit-scrollbar,
  & > .ul::-webkit-scrollbar {
    width: 0;
  }
  .scrollbar-track {
    width: 0.5625rem;
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
  }
  .scrollbar-thumb {
    position: absolute;
    top: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.3125rem;
    min-height: 1.625rem;
    width: 0.375rem;
    &.dragging,
    &:hover {
      border-radius: 0.5rem;
      width: 0.5625rem;
    }
  }
}
</style>
