<template>
  <div ref="scroll" class="mixin-scrollbar">
    <slot />
    <div
      class="scrollbar-thumb"
      :class="{dragging}"
      @mouseover="thumbMouseOver"
      @mouseout="thumbMouseOut"
      @mousedown="thumbMouseDown"
      v-show="thumbShowForce"
      :style="{
        opacity: thumbShow ? 1 : 0,
        transform: `translate3d(0, ${thumbTop}px, 0)`,
        height: thumbHeight + 'px'
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
      timeoutListener: null,
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
      setTimeout(() => {
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
          clearTimeout(this.timeoutListener)
          this.timeoutListener = setTimeout(() => {
            if (!this.thumbShowLock) {
              this.thumbShow = false
            }
          }, 1000)
        }
        this.thumbHeight = (scrollBox.clientHeight / scrollBox.scrollHeight) * scrollBox.clientHeight
        let maxScrollTop = scrollBox.scrollHeight - scrollBox.clientHeight
        if (maxScrollTop > 30000) {
          maxScrollTop = 30000
        }
        this.thumbTop = (scrollBox.scrollTop * (scrollBox.clientHeight - this.thumbHeight)) / maxScrollTop
        if (this.thumbHeight < 25) {
          this.thumbTop -= 25 - this.thumbHeight
        }
        if (this.thumbTop < 0) {
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
    }
  },
  mounted() {
    this.scrollBox = this.$refs.scroll.querySelector('ul')
    if (!this.scrollBox) {
      this.scrollBox = this.$refs.scroll.querySelector('.ul')
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

  overflow: auto;
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
  .scrollbar-thumb {
    position: absolute;
    z-index: 9999;
    top: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 5px;
    min-height: 25px;
    width: 6px;
    transition: transform 0.05s ease-out, width 0.15s, opacity 0.5s, height 0.55s;
    &.dragging,
    &:hover {
      border-radius: 8px;
      width: 9px;
    }
  }
}
</style>
