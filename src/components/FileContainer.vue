<template>
  <div class="file_layout">
    <div class="header" @click="$emit('close')">
      <svg-icon style="font-size: 1.2rem" icon-class="ic_close" />
      <label>{{$t('chat.preview')}}</label>
    </div>
    <div class="content">
      <img class="image" :src="getPath()" v-if="showImage" />
      <div class="file" v-else-if="fileName">
        <svg-icon style="font-size: 2rem" icon-class="ic_file" />
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

<script lang="ts">
import { isImage } from '@/utils/attachment_util'
import path from 'path'
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component
export default class FileContainer extends Vue {
  // @ts-ignore
  @Prop(File | Object) readonly file: any
  @Prop(Boolean) readonly dragging: any

  getPath() {
    if (this.file) {
      return 'file://' + this.file.path
    } else {
      return ''
    }
  }

  get showImage() {
    if (this.file) {
      return isImage(this.file.type)
    } else {
      return false
    }
  }
  get fileName() {
    if (this.file) {
      return path.parse(this.file.path).base
    }
    return ''
  }
}
</script>

<style lang="scss" scoped>
.file_layout {
  background: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;
  z-index: 200;
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
        margin-top: 0.8rem;
        word-break: break-all;
        padding: 0 0.8rem;
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
    top: 2.85rem;
    left: 0.8rem;
    right: 0.8rem;
    bottom: 4.8rem;
    font-size: 1rem;
    background: #f5f7fa;
    border-radius: 0.5rem;
    border: 0.05rem dashed #c0cfe6;
  }
  .header {
    padding: 0.8rem;
    display: flex;
    pointer-events: all;
    label {
      font-weight: 600;
      font-size: 0.9rem;
      margin-left: 0.3rem;
    }
  }

  .create {
    width: 1.4rem;
    height: 1.4rem;
    background: #397ee4;
    cursor: pointer;
    color: white;
    padding: 0.6rem;
    border-radius: 1.4rem;
    position: absolute;
    bottom: 1.2rem;
    left: 0;
    right: 0;
    margin: auto;
    box-shadow: 0 0.15rem 0.3rem rgba(0, 0, 0, 0.16), 0 0.15rem 0.3rem rgba(0, 0, 0, 0.23);
    pointer-events: all;
    &.disabled {
      background: #e5e7ec;
      box-shadow: none;
    }
  }
}
</style>
