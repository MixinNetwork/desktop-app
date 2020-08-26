<template>
  <div class="file_layout">
    <div class="header" @click="$emit('close')">
      <svg-icon style="font-size: 1.2rem" icon-class="ic_close" />
      <label>{{$t('chat.preview')}}</label>
    </div>
    <div class="content">
      <img class="image" :src="getPath()" v-if="showImageType === 'image'" />
      <div class="video-preview" v-else-if="showImageType === 'video'">
        <video class="image" ref="player" @click="videoPause" @ended="ended" @loadeddata="loadeddata" :src="getPath()" preload></video>
        <svg-icon class="play" v-if="!videoPlaying" icon-class="ic_play" @click="videoPlay" />
      </div>
      <div class="file" v-else-if="fileName">
        <svg-icon style="font-size: 2rem" icon-class="ic_file" />
        <span class="info">{{fileName}}</span>
        <b class="unsupported" v-show="fileUnsupported">{{$t('file_unsupported')}}</b>
      </div>
    </div>
    <p v-show="dragging" class="cover">{{$t('drag_file')}}</p>
    <font-awesome-icon
      class="create"
      :class="{disabled: dragging || fileUnsupported}"
      icon="arrow-right"
      @click="sendFile"
    />
  </div>
</template>

<script lang="ts">
import { isImage, isVideo } from '@/utils/attachment_util'
import path from 'path'
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component
export default class FileContainer extends Vue {
  // @ts-ignore
  @Prop(File | Object) readonly file: any
  @Prop(Boolean) readonly dragging: any
  @Prop(Boolean) readonly fileUnsupported: any

  thumbImage: any = null
  videoPlaying: boolean = false

  get showImageType() {
    if (this.file) {
      if (isImage(this.file.type)) {
        return 'image'
      } else if (isVideo(this.file.type)) {
        return 'video'
      }
      return ''
    } else {
      return ''
    }
  }
  get fileName() {
    if (this.file) {
      return path.parse(this.file.path).base
    }
    return ''
  }

  videoPlay() {
    const player: any = this.$refs.player
    this.videoPlaying = true
    player.play()
  }

  videoPause() {
    const player: any = this.$refs.player
    this.videoPlaying = false
    player.pause()
  }

  ended() {
    this.videoPlaying = false
  }

  loadeddata() {
    const video: any = this.$refs.player
    const canvas = document.createElement('canvas')
    const scale = 20 / video.videoWidth
    canvas.width = Math.ceil(video.videoWidth * scale)
    canvas.height = Math.ceil(video.videoHeight * scale)
    // @ts-ignore
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)

    const img = document.createElement('img')
    img.src = canvas.toDataURL('image/png')
    this.thumbImage = canvas.toDataURL('image/png').split(';base64,')[1]
  }

  getPath() {
    if (this.file) {
      return 'file://' + this.file.path
    } else {
      return ''
    }
  }

  sendFile() {
    if (this.dragging || this.fileUnsupported) return
    let ret = {}
    if (this.showImageType === 'video') {
      const $video: any = this.$refs.player
      ret = {
        duration: Math.ceil($video.duration * 1000),
        width: $video.videoWidth,
        height: $video.videoHeight,
        thumbImage: this.thumbImage
      }
    }
    this.$emit('sendFile', ret)
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
    .video-preview {
      text-align: center;
      .play {
        cursor: pointer;
        width: 2rem;
        height: 2rem;
        position: absolute;
        margin: auto;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 10;
      }
    }
    .file {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      .info {
        margin-top: 0.8rem;
        word-wrap: break-word;
        white-space: pre-wrap;
        padding: 0 0.8rem;
      }
      .unsupported {
        margin: 2rem 0 1rem;
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
    background: $bg-color;
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
