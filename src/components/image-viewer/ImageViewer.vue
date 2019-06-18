<template>
  <transition name="image-viewer-fade">
    <div class="image-viewer" v-show="visible">
      <div class="image-viewer-close icon-close" @click="close">
        <ICClose></ICClose>
      </div>
      <div class="image-viewer-content" v-if="images.length">
        <div class="scorll" :style="scorllStyle">
          <img
            :src="images[index].url"
            :alt="images[index].name?images[index].name:''"
            :style="imgSize"
            @dblclick="zoom"
            v-show="imgVisible"
          >
        </div>
        <div class="image-viewer-info">
          <p>{{images[index].name?images[index].name:""}}({{(index+1)+'/'+images.length}})</p>
          <ICDownload @click="openFile(images[index])"></ICDownload>
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
            >
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import fs from 'fs'
import path from 'path'
import ICClose from '../../assets/images/ic_close_white.svg'
import ICDownload from '../../assets/images/download.svg'
export default {
  name: 'imageViewer',
  components: {
    ICClose,
    ICDownload
  },
  data() {
    return {
      config: {
        imgMaxWidth: window.innerWidth * 0.8,
        imgMaxHeight: window.innerHeight * 0.8
      },
      visible: false,
      imgVisible: false,
      imgSize: {},
      index: 0,
      images: [],
      scale: 1,
      scrollStyle: {}
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
    },
    index(value) {
      this.imgVisible = false
      this.index = value
      this.scale = 1
      this.imgStyle(value)
      this.$nextTick(() => {
        const _img = document.querySelector('.image-viewer-content > div > img')
        const _width = _img.width
        this.$refs.scroll.scrollLeft = _width * (value - 1)
      })
    }
  },
  mounted() {
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
      const savePath = this.$electron.remote.dialog.showSaveDialog(this.$electron.remote.getCurrentWindow(), {
        defaultPath: path.basename(sourcePath)
      })
      if (!savePath) {
        return
      }
      fs.copyFileSync(sourcePath, savePath)
    },
    keyUp(event) {
      if (event.code === 'Escape') {
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
      let { images, config, index, scale } = this
      let item = images[index]
      let size = {}
      let imgMaxWidth = config.imgMaxWidth
      let imgMaxHeight = config.imgMaxHeight
      let ratio = item.width / item.height

      size.height = imgMaxHeight
      size.width = imgMaxHeight * ratio
      if (size.width > imgMaxWidth) {
        size.width = imgMaxWidth
        size.height = imgMaxWidth / ratio
      } else if (size.width < imgMaxWidth / 2) {
        size.width = imgMaxWidth / 2
        size.height = imgMaxWidth / 2 / ratio
      }
      this.imgSize = {
        width: size.width * scale + 'px',
        height: size.height * scale + 'px'
      }
      if (size.height < imgMaxHeight) {
        this.scorllStyle = { 'align-items': 'center' }
      } else {
        this.scorllStyle = {}
      }
      this.imgVisible = true
    },
    zoom() {
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
.scorll {
  overflow: scroll;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
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
    font-family: Helvetica Neue, Helvetica, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial, Ionicons, iconfont,
      'vue-image-viewer-icon', sans-serif;
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
  height: 80%;
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
  height: 40px;
  padding: 0 3% 10px;
  display: flex;
  cursor: pointer;
  > *,
  .right > * {
    height: 100%;
    text-shadow: 0 0 2px #000, 0 0 2px #000;
    color: #fff;
  }
  > p {
    flex: 1;
    line-height: 30px;
    font-size: 14px;
    cursor: default;
  }
  .right {
    width: 200px;
    i {
      width: 30px;
      height: 30px;
      margin-right: 20px;
      font-size: 20px;
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
    width: 99%;
    height: 100%;
    margin: 0 auto;
    word-wrap: normal;
    white-space: nowrap;
    overflow: hidden;
  }
  &-thumb {
    height: 100%;
    display: flex;
    overflow: scroll;
    flex-direction: row;
    #thumb {
      display: inline-block;
      width: 12%;
      height: 90%;
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
        border: 4px solid #333;
      }
      &:hover {
        border: 4px solid #666;
      }
    }
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
    width: 20px;
    height: 20px;
    line-height: 20px;
    font-size: 20px;
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
  top: 20px;
  right: 20px;
  position: absolute;
  cursor: pointer;
}
.image-viewer-content-prev:hover > i,
.image-viewer-content-next:hover > i,
.image-viewer-nav-prev:hover > i,
.image-viewer-nav-next:hover > i,
.image-viewer-close:hover {
  text-shadow: 0 0 20px #fff, 0 0 20px #fff, 0 0 20px #fff;
}
</style>
