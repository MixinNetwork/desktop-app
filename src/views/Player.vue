<template>
  <div class="player" ref="player" @mouseenter="enter" @mouseleave="leave">
    <video-player
      ref="videoPlayer"
      @loadeddata="loaded = true"
      :single="true"
      :options="playerOptions"
    ></video-player>
    <div class="bar" v-show="show">
      <div class="drag-area"></div>
      <svg-icon icon-class="ic_player_close" class="icon" @click="close" />
      <svg-icon icon-class="ic_minimize" class="icon" @click="minimize" />
      <svg-icon icon-class="ic_unpin" class="icon" v-show="pin" @click="toggle" />
      <svg-icon icon-class="ic_pin" class="icon" v-show="!pin" @click="toggle" />
    </div>
  </div>
</template>
<script lang="ts">
import log from 'electron-log'
import { ipcRenderer, screen } from 'electron'

import { Vue, Watch, Component } from 'vue-property-decorator'

@Component
export default class Player extends Vue {
  @Watch('pin')
  onPinChange(newPin: any) {
    localStorage.pinTop = newPin
  }

  show: boolean = false
  pin: boolean = false
  resizeInterval: any = null
  loaded: boolean = false
  init: boolean = false

  get playerOptions() {
    const url: any = this.$route.query.url
    return {
      autoplay: true,
      language: navigator.language.split('-')[0],
      playbackRates: ['0.5', '1.0', '1.5', '2.0'],
      disablePictureInPicture: true,
      sources: [
        {
          src: decodeURIComponent(url)
        }
      ]
    }
  }

  toggle() {
    this.pin = !this.pin
    ipcRenderer.send('pinToggle', this.pin)
  }
  close() {
    ipcRenderer.send('closePlayer', this.pin)
    clearInterval(this.resizeInterval)
  }
  minimize() {
    ipcRenderer.send('minimizePlayer', this.pin)
  }
  enter() {
    this.show = true
  }
  leave() {
    this.show = false
  }
  mounted() {
    this.pin = localStorage.pinTop === 'true'
    clearInterval(this.resizeInterval)
    this.resizeInterval = setInterval(() => {
      const videoPlayer: any = this.$refs.videoPlayer
      if (this.loaded) {
        let width = videoPlayer.player.currentWidth()
        let height = videoPlayer.player.currentHeight()
        if (!this.init && height > 700) {
          this.init = true
          const ratio = width / height
          height = 700
          width = height * ratio
        }
        width = Math.ceil(width)
        height = Math.ceil(height)
        ipcRenderer.send('resize', { width, height })
        // for macOS
        if (process.platform === 'darwin') {
          clearInterval(this.resizeInterval)
        }
      }
    }, 10)
  }
}
</script>
<style lang="scss" scoped>
.player {
  position: absolute;
  width: 100%;
  height: 100%;
  background: black;
  color: #fff;
  .bar {
    font-size: 0.7rem;
    width: 100%;
    position: absolute;
    top: 0;
    right: 0;
    padding-top: 0.6rem;
    padding-bottom: 0.6rem;
    z-index: 10;
    display: flex;
    flex-direction: row-reverse;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.8) 100%);
    .drag-area {
      position: absolute;
      z-index: -1;
      top: 0;
      left: 0;
      width: calc(100% - 4.5rem);
      height: 100%;
      -webkit-app-region: drag;
    }
    .icon {
      cursor: pointer;
      margin-right: 0.6rem;
    }
  }
}
</style>
