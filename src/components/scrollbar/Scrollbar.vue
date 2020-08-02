<template>
  <div ref="scroll" class="mixin-scrollbar">
    <slot />
    <div class="scrollbar-track" @mouseover="trackHover(true)" @mouseout="trackHover(false)"></div>
    <div
      class="scrollbar-thumb"
      :class="{ dragging }"
      @mouseover="thumbMouseOver"
      @mouseout="thumbMouseOut"
      @mousedown="thumbMouseDown"
      v-show="!hideScroll"
      :style="{
        opacity: thumbShow ? 1 : 0,
        transform: `translate3d(0, ${thumbTop}px, 0)`,
        height: thumbHeight + 'px',
        transition: 'transform 0.15s ease-out, width 0.15s, opacity 0.5s, height 0.55s'
      }"
    ></div>
  </div>
</template>

<script lang="ts">
import { Vue, Prop, Watch, Component } from 'vue-property-decorator'

@Component
export default class MixinScrollbar extends Vue {
  @Prop(Boolean) readonly hideScroll: any
  @Prop(Boolean) readonly isBottom: any
  @Prop(Object) readonly globalOptions: any
  @Prop(Object) readonly options: any

  @Watch('hideScroll')
  onHideScrollChange() {
    this.thumbShow = false
  }

  @Watch('thumbHeight')
  onThumbHeightChange(val: any) {
    this.dragging = false
  }

  scrollBox: any = null
  scrollThumb: any = null
  thumbShowTimeout: any = null
  thumbTop: any = 0
  thumbHeight: any = 25
  thumbShow: boolean = false
  thumbShowLock: boolean = false
  tempThumb: any = {
    top: 0,
    y: 0
  }
  dragging: boolean = false

  scrollInit() {
    const scrollBox = this.scrollBox

    scrollBox.scrollTop = 0

    let beforeScrollTop: number = 0
    let goDownBuffer: any = []
    let scrollLock: boolean = false
    scrollBox.onscroll = (e: any) => {
      if (scrollLock) return
      scrollLock = true

      const { clientHeight, scrollHeight, scrollTop } = scrollBox

      const goDown = beforeScrollTop < scrollTop
      goDownBuffer.unshift(goDown)
      goDownBuffer = goDownBuffer.splice(0, 3)
      let direction = ''
      if (goDownBuffer[0] !== undefined && goDownBuffer[0] === goDownBuffer[1]) {
        direction = goDownBuffer[1] ? 'down' : 'up'
      }
      beforeScrollTop = scrollTop

      if (!this.thumbShowLock && !this.thumbShow) {
        if (!this.hideScroll) {
          this.thumbShow = true
        }
      }
      if (this.thumbShow) {
        clearTimeout(this.thumbShowTimeout)
        this.thumbShowTimeout = setTimeout(() => {
          if (!this.thumbShowLock) {
            this.thumbShow = false
          }
        }, 1000)
      }
      const maxScrollTop = scrollHeight - clientHeight
      requestAnimationFrame(() => {
        this.thumbHeight = Math.floor((clientHeight / scrollHeight) * clientHeight)
        let thumbTop: number = (scrollTop * (clientHeight - this.thumbHeight)) / maxScrollTop
        if (thumbTop > clientHeight - this.thumbHeight - 25) {
          thumbTop = Math.floor(thumbTop)
        }
        if (this.thumbHeight < 25) {
          thumbTop -= 25 - this.thumbHeight
        }
        this.thumbTop = thumbTop
        if (this.thumbTop < 0 || clientHeight >= scrollHeight) {
          this.thumbTop = 0
        }
        scrollLock = false
      })
      this.$emit('scroll', {
        direction
      })
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
      const offset = event.clientY - this.tempThumb.y
      const scrollBox = this.scrollBox
      const maxScrollTop = scrollBox.scrollHeight - scrollBox.clientHeight
      scrollBox.scrollTop = ((this.tempThumb.top + offset) / (scrollBox.clientHeight - this.thumbHeight)) * maxScrollTop
    }
    document.onmouseup = () => {
      this.dragging = false
      this.thumbMouseOut()
    }
    e.preventDefault()
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

    this.scrollInit()

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
    width: 0.45rem;
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
    border-radius: 0.25rem;
    min-height: 1.3rem;
    width: 0.3rem;
    &.dragging,
    &:hover {
      border-radius: 0.4rem;
      width: 0.45rem;
    }
  }
}
</style>
