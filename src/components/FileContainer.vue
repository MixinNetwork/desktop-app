<template>
  <div class="file_layout">
    <div class="header" @click="$emit('onClose')">
      <ICClose />
      <label>{{$t('chat.preview')}}</label>
    </div>
    <div class="content">
      <img class="image" :src="getPath()" v-if="showImage" />
      <div class="file" v-else>
        <ICFile />
        <span class="info">{{fileName}}</span>
      </div>
    </div>
    <p v-show="dragging" class="cover">{{$t('drag_file')}}</p>
    <font-awesome-icon
      class="create"
      :class="{disabled: dragging}"
      icon="arrow-right"
      @click="$emit('sendFile')"
    />
  </div>
</template>

<script>
import ICClose from '@/assets/images/ic_close.svg'
import ICFile from '@/assets/images/ic_file.svg'
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
  background: #fff;
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
    height: 100%;
    .image {
      max-width: 80%;
      max-height: 80%;
      margin-bottom: 10%;
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
    margin: 0;
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    top: 3.6rem;
    left: 16px;
    right: 16px;
    bottom: 96px;
    font-size: 20px;
    background: #f5f7fa;
    border-radius: 10px;
    border: 1px dashed #c0cfe6;
  }
  .header {
    padding: 16px;
    display: flex;
    pointer-events: all;
    label {
      font-weight: 600;
      font-size: 18px;
      margin-left: 6px;
    }
  }

  .create {
    width: 28px;
    height: 28px;
    background: #397ee4;
    cursor: pointer;
    color: white;
    padding: 12px;
    border-radius: 28px;
    position: absolute;
    bottom: 24px;
    left: 0;
    right: 0;
    margin: auto;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
    pointer-events: all;
    &.disabled {
      background: #e5e7ec;
      box-shadow: none;
    }
  }
}
</style>
