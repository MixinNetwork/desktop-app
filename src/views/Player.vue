<template>
  <div class="player" ref="player" @mouseenter="enter" @mouseleave="leave">
    <div class="bar" v-show="show">
      <svg-icon icon-class="ic_player_close" class="icon" @click="close" />
      <svg-icon icon-class="ic_minimize" class="icon" @click="minimize" />
      <svg-icon icon-class="ic_unpin" class="icon" v-show="pin" @click="toggle" />
      <svg-icon icon-class="ic_pin" class="icon" v-show="!pin" @click="toggle" />
    </div>
  </div>
</template>
<script lang="ts">
// @ts-ignore
import Chimee from 'chimee'
// @ts-ignore
import ChimeeKernelHls from 'chimee-kernel-hls'
import { ipcRenderer } from 'electron'

import { Vue, Watch, Component } from 'vue-property-decorator'

@Component
export default class Player extends Vue {
  show: boolean = false
  pin: boolean = false
  chimee: any

  @Watch('pin')
  onPinChange(newPin: any) {
    localStorage.pinTop = newPin
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
    let args = this.$route.query
    let player = this.$refs.player
    this.chimee = new Chimee({
      wrapper: player,
      isLive: true,
      kernels: {
        hls: ChimeeKernelHls
      },
      crossOrigin: true,
      autoplay: true,
      autoload: false,
      poster: args.thumb,
      controls: true
    })
    this.chimee.load(args.url)
    this.chimee.play()
  }
}
</script>
<style lang="scss" scoped>
.player {
  width: 100%;
  height: 100%;
  background: black;
  border-radius: 0.25rem;
  color: #fff;
  .bar {
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
