<template>
  <transition name="image-viewer-fade">
    <div class="image-viewer" v-show="visible">
      <div class="image-viewer-close icon-close" @click="close">
        <ICClose></ICClose>
      </div>
      <div class="image-viewer-content" v-if="images.length">
        <img
          :src="images[index].url"
          :alt="images[index].name?images[index].name:''"
          :width="imgStyle.width"
          :height="imgStyle.height"
          v-show="imgVisible"
        >
        <div class="image-viewer-info">
          <p>{{images[index].name?images[index].name:""}}({{(index+1)+'/'+images.length}})</p>
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
import ICClose from '../../assets/images/ic_close_white.svg'
export default {
  name: 'imageViewer',
  components: {
    ICClose
  },
  data() {
    return {
      config: {
        imgMaxWidth: window.innerWidth * 0.8,
        imgMaxHeight: window.innerHeight * 0.8
      },
      imgStyle: {
        width: 'auto',
        height: 'auto'
      },
      visible: false,
      imgVisible: false,
      index: 0,
      images: []
    }
  },
  watch: {
    visible(val) {
      if (this.images.length) {
        if (val) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''

        this.imgLoad(this.imgSize)
      } else {
        this.visible = false
      }
    },
    index(value) {
      this.imgStyle = {
        width: 'auto',
        height: 'auto'
      }
      this.imgVisible = false
      this.imgLoad(this.imgSize)
      this.$nextTick(() => {
        const _img = document.querySelector('.image-viewer-nav-thumb > img')
        const _width = _img.width
        this.$refs.scroll.scrollLeft = _width * (value - 1)
      })
    }
  },
  mounted() {
    window.addEventListener('keyup', this.keyUp)
  },
  methods: {
    keyUp(event) {
      if (event.code === 'Escape') {
        this.close()
      }
    },
    imgLoad(callback) {
      setTimeout(() => {
        const $img = document.querySelector('.image-viewer-content > img')
        const timer = setInterval(() => {
          if ($img.complete) {
            callback()
            clearInterval(timer)
          }
        }, 100)
      })
    },
    imgSize(recursionWidth, recursionHeight) {
      const _img = document.querySelector('.image-viewer-content > img')
      const _width = recursionWidth || _img.width
      const _height = recursionHeight || _img.height

      let imgSizeAuto = this.imgSizeAuto(_width, _height)
      if (imgSizeAuto.width - 10 > this.config.imgMaxWidth || imgSizeAuto.height - 10 > this.config.imgMaxHeight) {
        this.imgSize(imgSizeAuto.width, imgSizeAuto.height)
      } else {
        this.imgStyle = imgSizeAuto
        this.imgVisible = true
      }
    },
    imgSizeAuto(width, height) {
      let zoomSize = 0

      if (width > this.config.imgMaxWidth || height > this.config.imgMaxHeight) {
        zoomSize =
          width - this.config.imgMaxWidth > height - this.config.imgMaxHeight
            ? this.config.imgMaxWidth / width
            : this.config.imgMaxHeight / height
        return {
          width: width * zoomSize,
          height: height * zoomSize
        }
      }
      return {
        width,
        height
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
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
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
  position: absolute;
  top: 40px;
  right: 40px;
  width: 30px;
  height: 30px;
  line-height: 30px;
  font-size: 30px;
  color: #fff;
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
