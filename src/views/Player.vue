<template>
  <div class="player" ref="player" @mouseenter="enter" @mouseleave="leave">
    <div class="bar" v-show="show">
      <svg-icon icon-class="ic_player_close" class="icon" @click="close" />
      <svg-icon icon-class="ic_minimize" class="icon" @click="minimize" />
      <svg-icon icon-class="ic_unpin" class="icon" v-show="pin" @click="toggle" />
      <svg-icon icon-class="ic_pin" class="icon" v-show="!pin" @click="toggle" />
    </div>
    <video-player ref="videoPlayer" :single="true" :options="playerOptions"></video-player>
  </div>
</template>
<script lang="ts">
import log from 'electron-log'
import { ipcRenderer, screen } from 'electron'

import { Vue, Watch, Component } from 'vue-property-decorator'

@Component
export default class Player extends Vue {
  show: boolean = false
  pin: boolean = false

  @Watch('pin')
  onPinChange(newPin: any) {
    localStorage.pinTop = newPin
  }

  get playerOptions() {
    return {
      autoplay: true,
      language: navigator.language.split('-')[0],
      playbackRates: ['0.5', '1.0', '1.5', '2.0'],
      disablePictureInPicture: true,
      sources: [
        {
          src: this.$route.query.url
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
  }
}
</script>
<style lang="scss" scoped>
.player {
  position: absolute;
  width: 100%;
  height: 100%;
  background: black;
  border-radius: 0.25rem;
  color: #fff;
  .bar {
    font-size: 0.7rem;
    width: 100%;
    position: absolute;
    right: 0;
    padding-top: 0.6rem;
    padding-bottom: 0.6rem;
    z-index: 10;
    display: flex;
    flex-direction: row-reverse;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.8) 100%);
    .icon {
      margin-right: 0.6rem;
    }
  }
}
</style>
