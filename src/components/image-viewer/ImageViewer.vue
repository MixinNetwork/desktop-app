<template>
  <transition name="image-viewer-fade">
    <div class="image-viewer" :style="{top: showTitlebar ? '1.4rem' : ''}" v-show="visible">
      <div class="image-viewer-close icon-close" @click="close">
        <svg-icon style="font-size: 1.2rem" v-if="visible" icon-class="ic_close_white" />
      </div>
      <div class="image-viewer-content" v-if="images.length">
        <div class="scorll" ref="box" :style="scrollStyle">
          <img
            :src="images[index].url"
            :alt="images[index].name?images[index].name:''"
            :style="imgSize"
            @mousedown="mousedown"
            @mousemove="mousemove"
            @mouseout="mouseout"
            @mouseup="zoom"
            v-show="imgVisible"
            ondragstart="return false;"
          />
        </div>
        <div class="image-viewer-info">
          <p>{{images[index].name?images[index].name:""}}({{(index+1)+'/'+images.length}})</p>
          <svg-icon
            style="font-size: 1.2rem"
            icon-class="download"
            @click="openFile(images[index])"
          />
        </div>
        <div class="image-viewer-content-prev" @click="imgChange('prev')"></div>
        <div class="image-viewer-content-next" @click="imgChange('next')"></div>
      </div>
      <div class="image-viewer-nav">
        <div class="image-viewer-nav-main">
          <div class="image-viewer-nav-thumb" ref="scroll">
            <img
              id="thumb"
              v-for="(il,i) in images"
              :class="{active:i===index}"
              :key="i"
              :src="il.url"
              @click="imgChange(i)"
            />
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import fs from 'fs'
import path from 'path'
export default {
  name: 'imageViewer',
  data() {
    return {
      visible: false,
      imgVisible: false,
      imgSize: {},
      index: 0,
      images: [],
      scale: 1,
      scrollStyle: {},
      moved: false,
      tempPos: {},
      limit: 100,
      showTitlebar: false
    }
  },
  watch: {
    visible(val) {
      if (this.images.length) {
        if (val) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        this.scale = 1
        this.imgStyle(this.index)
      } else {
        this.visible = false
      }
      setTimeout(() => {
        const img = document.querySelector('.image-viewer-nav-thumb > img')
        if (img) {
          this.$refs.scroll.scrollLeft = img.width * this.index
        }
      }, 100)
    },
    index(value) {
      this.imgVisible = false
      this.index = value
      this.scale = 1
      this.imgStyle(value)
      setTimeout(() => {
        const img = document.querySelector('.image-viewer-nav-thumb > img')
        this.$refs.scroll.scrollLeft = img.width * (value - 1)
      })
    }
  },
  mounted() {
    this.showTitlebar = process.platform === 'win32'
    window.addEventListener('keyup', this.keyUp)
  },
  methods: {
    openFile: function(item) {
      if (!item.url) {
        return
      }
      let sourcePath = item.url
      if (sourcePath.startsWith('file://')) {
        sourcePath = sourcePath.replace('file://', '')
      }
      const savePath = this.$electron.remote.dialog.showSaveDialogSync(this.$electron.remote.getCurrentWindow(), {
        defaultPath: path.basename(sourcePath)
      })
      if (!savePath) {
        return
      }
      fs.copyFileSync(sourcePath, savePath)
    },
    keyUp(event) {
      if (!this.visible) {
        return true
      } else if (event.code === 'Escape') {
        this.close()
      } else if (event.code === 'ArrowLeft') {
        this.imgChange('prev')
      } else if (event.code === 'ArrowRight') {
        this.imgChange('next')
      }
    },
    imgChange(action) {
      const length = this.images.length - 1
      if (action === 'prev') {
        this.index = this.index-- <= 0 ? 0 : this.index
      } else if (action === 'next') {
        this.index = this.index++ >= length ? length : this.index
      } else if (!isNaN(action)) {
        this.index = action <= 0 ? 0 : action >= length ? length : action
      }
    },
    imgStyle() {
      let { images, index, scale } = this
      let item = images[index]
      if (item && item.width && item.height) {
        let size = {
          width: item.width,
          height: item.height
        }
        let imgMaxWidth = window.innerWidth * 0.8
        let imgMaxHeight = window.innerHeight * 0.8
        let ratio = item.width / item.height

        if (imgMaxWidth > imgMaxHeight * ratio && item.height > imgMaxHeight) {
          size.height = imgMaxHeight
          size.width = imgMaxHeight * ratio
        } else if (item.width > imgMaxWidth) {
          size.width = imgMaxWidth
          size.height = imgMaxWidth / ratio
        }

        setTimeout(() => {
          const $box = this.$refs.box

          this.scrollStyle.alignItems = size.height * scale < $box.clientHeight ? 'center' : ''
          this.scrollStyle.justifyContent = size.width * scale < $box.clientWidth ? 'center' : ''

          this.imgSize = {
            width: size.width * scale + 'px',
            height: size.height * scale + 'px',
            cursor: scale < 3 ? 'zoom-in' : 'zoom-out'
          }

          this.imgVisible = true
        })
      }
    },
    mousedown(e) {
      this.imgSize.cursor = 'move'
      const { scrollLeft, scrollTop } = this.$refs.box
      this.tempPos = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft,
        scrollTop
      }
    },
    mousemove(e) {
      if (this.imgSize.cursor === 'move') {
        this.moved = true
        const { x, y, scrollLeft, scrollTop } = this.tempPos
        const $box = this.$refs.box
        $box.scrollLeft = scrollLeft - (e.clientX - x)
        $box.scrollTop = scrollTop - (e.clientY - y)
      }
    },
    mouseout() {
      this.imgSize.cursor = this.scale < 3 ? 'zoom-in' : 'zoom-out'
      if (this.moved) {
        this.moved = false
      }
    },
    zoom() {
      this.imgSize.cursor = this.scale < 3 ? 'zoom-in' : 'zoom-out'
      if (this.moved) {
        this.moved = false
        return
      }
      if (this.scale === 1) {
        this.scale = 2
      } else if (this.scale === 2) {
        this.scale = 3
      } else {
        this.scale = 1
      }
      this.imgStyle()
    },
    close() {
      this.visible = false
    }
  }
}
</script>
<style lang="scss" scoped>
.image-viewer-fade-enter-active,
.image-viewer-fade-leave-active {
  opacity: 1;
  transition: opacity 0.3s linear;
}
.image-viewer-fade-enter,
.image-viewer-fade-leave-to {
  opacity: 0;
}

* {
  ::-webkit-scrollbar {
    width: 0.35rem;
    height: 0.35rem;
    background: transparent;
  }
  ::-webkit-scrollbar-track-piece,
  ::-webkit-scrollbar-corner {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 0.25rem;
    width: 0.35rem;
    background: #11111177;
    cursor: pointer;
  }
}

.scorll {
  overflow: auto;
  width: 100%;
  height: 100%;
  display: flex;
  img {
    flex: 0 0 auto;
  }
}
.image-viewer {
  z-index: 1000;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  &,
  * {
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;
    list-style-type: none;
    zoom: 1;
    resize: none;
    box-sizing: border-box;

    vertical-align: baseline;
    user-select: none;
  }
  i {
    display: inline-block;
    text-align: center;
    font-style: normal;
  }
  img {
    display: block;
  }
}

.image-viewer-content,
.image-viewer-nav {
  position: relative;
  width: 100%;
}

.image-viewer-content {
  height: 85%;
  > img {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    background-color: #fff;
  }
}
.image-viewer-content-prev,
.image-viewer-content-next {
  z-index: 1000;
  width: 20%;
  height: 60%;
  margin: auto;
  position: absolute;
  top: 0;
  bottom: 0;
}
.image-viewer-content-prev {
  left: 0;
  cursor: url(../../assets/arrow-left.png), auto;
}
.image-viewer-content-next {
  right: 0;
  cursor: url(../../assets/arrow-right.png), auto;
}

.image-viewer-info {
  z-index: 1001;
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 1.6rem;
  padding: 0 3%;
  margin-bottom: 0.6rem;
  display: flex;
  cursor: pointer;
  > *,
  .right > * {
    height: 100%;
    text-shadow: 0 0 0.1rem #000, 0 0 0.1rem #000;
    color: #fff;
  }
  > p {
    flex: 1;
    line-height: 1.5rem;
    font-size: 0.7rem;
    cursor: default;
  }
  .right {
    width: 10rem;
    i {
      width: 1.5rem;
      height: 1.5rem;
      margin-right: 1rem;
      font-size: 1rem;
      cursor: pointer;
      &:last-child {
        margin: 0;
      }
    }
  }
}

.image-viewer-nav {
  height: 15%;
  background-color: rgba(0, 0, 0, 0.7);
  &-main {
    width: 100%;
    height: 100%;
    margin: 0 auto;
    word-wrap: normal;
    white-space: nowrap;
    overflow: hidden;
  }
  &-thumb {
    height: 100%;
    display: flex;
    overflow-x: scroll;
    flex-direction: row;
    &::-webkit-scrollbar-thumb {
      background: #5f5f5faa;
    }
    #thumb {
      display: inline-block;
      width: 12%;
      height: calc(100% - 0.3rem);
      margin: 0.4% 0 0.4% 0.4%;
      cursor: pointer;
      object-fit: cover;
      border: 0 solid #333;
      transition: border 0.3s ease;
      &:first-child {
        transition-property: border, margin-left;
        margin-left: 0;
      }
      &.active {
        border: 0.2rem solid #333;
      }
      &:hover {
        border: 0.2rem solid #666;
      }
    }
  }
  ::-webkit-scrollbar-thumb {
    height: 0.3rem;
  }
}

.image-viewer-nav-prev,
.image-viewer-nav-next {
  position: absolute;
  top: 0;
  width: 3%;
  height: 100%;
  cursor: pointer;
  > i {
    width: 1rem;
    height: 1rem;
    line-height: 1rem;
    font-size: 1rem;
    color: #fff;
  }
}
.image-viewer-nav-prev {
  left: 0;
}
.image-viewer-nav-next {
  right: 0;
}

.image-viewer-close {
  z-index: 1001;
  top: 1rem;
  right: 1rem;
  position: absolute;
  cursor: pointer;
}
.image-viewer-content-prev:hover > i,
.image-viewer-content-next:hover > i,
.image-viewer-nav-prev:hover > i,
.image-viewer-nav-next:hover > i,
.image-viewer-close:hover {
  text-shadow: 0 0 1rem #fff, 0 0 1rem #fff, 0 0 1rem #fff;
}
</style>
