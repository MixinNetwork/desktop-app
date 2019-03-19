<template>
  <div class="file_layout">
    <div class="header" @click="$emit('onClose')">
      <ICClose></ICClose>
      <label>预览</label>
    </div>
    <div class="content">
      <img class="image" v-bind:src="getPath()" v-if="showImage">
      <div class="file" v-else>
        <ICFile></ICFile>
        <span class="info">{{fileName}}</span>
      </div>
    </div>
    <p v-show="dragging" class="cover">{{$t('drag_file')}}</p>
    <font-awesome-icon class="create" icon="arrow-right" @click="$emit('sendFile')"/>
  </div>
</template>

<script>
import ICClose from '../assets/images/ic_close.svg'
import ICFile from '../assets/images/ic_file.svg'
import { isImage } from '@/utils/attachment_util.js'
import path from 'path'
export default {
  name: 'FileContainer',
  props: ['file', 'dragging'],
  components: {
    ICClose,
    ICFile
  },
  methods: {
    getPath() {
      if (this.file) {
        return 'file://' + this.file.path
      } else {
        return ''
      }
    }
  },
  computed: {
    showImage() {
      if (this.file) {
        return isImage(this.file.type)
      } else {
        return false
      }
    },
    fileName() {
      if (this.file) {
        return path.parse(this.file.path).base
      }
      return ''
    }
  }
}
</script>

<style lang="scss" scoped>
.file_layout {
  background: #e5e5e5;
  display: flex;
  flex-direction: column;
  height: 100%;
  z-index: 20;
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    .image {
      max-width: 80%;
      max-height: 80%;
    }
    .file {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      .info {
        margin-top: 1rem;
      }
    }
  }
  .cover {
    border: black;
    width: 60vw;
    height: 60vw;
    position: absolute;
    margin-left: auto;
    margin-right: auto;
    line-height: 60vw;
    margin-top: auto;
    margin-bottom: auto;
    text-align: center;
    left: 0;
    font-size: 1.6rem;
    right: 0;
    top: 0;
    bottom: 0;
    border-style: dashed;
  }

  .header {
    padding: 16px;
    background: #2cbda5;
    display: flex;
    pointer-events: all;
    label {
      color: white;
      font-weight: 600;
      font-size: 18px;
      margin-left: 16px;
    }
  }

  .create {
    width: 28px;
    height: 28px;
    background: #35e27e;
    color: white;
    padding: 12px;
    border-radius: 28px;
    position: absolute;
    bottom: 48px;
    left: 0;
    right: 0;
    margin: auto;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
    pointer-events: all;
  }
}
</style>
