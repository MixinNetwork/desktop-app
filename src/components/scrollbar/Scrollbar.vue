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

<script>
export default {
  name: 'mixin-scrollbar',
  props: {
    goBottom: {
      type: Boolean,
      required: false,
      default: false
    },
    isBottom: {
      type: Boolean,
      required: false,
      default: false
    },
    showScroll: {
      type: Boolean,
      required: false,
      default: true
    },
    globalOptions: {
      type: Object,
      required: false,
      default: () => ({})
    },
    options: {
      type: Object,
      required: false,
      default: () => ({})
    }
  },
  data() {
    return {
      scrollBox: null,
      scrollThumb: null,
      goBottomTimeout: null,
      thumbShowTimeout: null,
      thumbTop: 0,
      thumbHeight: 25,
      thumbShow: false,
      thumbShowForce: true,
      thumbShowLock: false,
      tempThumb: {
        top: 0,
        y: 0
      },
      dragging: false
    }
  },
  watch: {
    goBottom() {
      this.thumbShowForce = false
      this.thumbShow = false
      this.thumbShowLock = true
      clearTimeout(this.goBottomTimeout)
      this.goBottomTimeout = setTimeout(() => {
        this.thumbShowForce = true
        this.thumbShowLock = false
      }, 500)
    }
  },
  methods: {
    scroll() {
      const scrollBox = this.scrollBox
      scrollBox.onscroll = e => {
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
        let thumbTop = (scrollBox.scrollTop * (scrollBox.clientHeight - this.thumbHeight)) / maxScrollTop
        if (thumbTop > scrollBox.clientHeight - this.thumbHeight - 25) {
          thumbTop = parseInt(thumbTop)
        }
        if (this.thumbHeight < 25) {
          thumbTop -= 25 - this.thumbHeight
        }
        this.thumbTop = thumbTop
        if (this.thumbTop < 0 || scrollBox.clientHeight >= scrollBox.scrollHeight) {
          this.thumbTop = 0
        }
      }
    },
    thumbMouseOver() {
      if (this.dragging) return
      this.thumbShow = true
      this.thumbShowLock = true
    },
    thumbMouseOut() {
      if (this.dragging) return
      this.thumbShowLock = false
      this.thumbShow = false
    },
    thumbMouseDown(e) {
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
    },
    trackHover(flag) {
      if (this.dragging) return
      this.thumbShow = flag
    }
  },
  mounted() {
    this.scrollBox = this.$refs.scroll.querySelector('.ul')
    if (!this.scrollBox) {
      this.scrollBox = this.$refs.scroll.querySelector('ul')
    }
    this.scrollThumb = this.$refs.scroll.querySelector('.scrollbar-thumb')

    this.scroll()

    this.$emit('init', this.scrollBox)
  },
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
    overflow-x: hidden;
  }
  &::-webkit-scrollbar,
  & > ul::-webkit-scrollbar,
  & > .ul::-webkit-scrollbar {
    width: 0;
  }
  .scrollbar-track {
    width: 9px;
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
    border-radius: 5px;
    min-height: 25px;
    width: 6px;
    &.dragging,
    &:hover {
      border-radius: 8px;
      width: 9px;
    }
  }
}
</style>
