<template>
  <div class="player" ref="player" @mouseenter="enter" @mouseleave="leave">
    <ICUnPin class="close" v-show="show&&pin" @click="toggle"></ICUnPin>
    <ICPin class="close" v-show="show&&!pin" @click="toggle"></ICPin>
  </div>
</template>
<script>
import Chimee from 'chimee'
import ChimeeKernelHls from 'chimee-kernel-hls'
import { ipcRenderer } from 'electron'
import ICPin from '@/assets/images/ic_pin.svg'
import ICUnPin from '@/assets/images/ic_unpin.svg'
export default {
  data: function() {
    return {
      show: false,
      pin: false
    }
  },
  components: {
    ICPin,
    ICUnPin
  },
  methods: {
    toggle: function() {
      this.pin = !this.pin
      localStorage.pin = this.pin
      ipcRenderer.send('pinToggle', this.pin)
    },
    enter: function() {
      this.show = true
    },
    leave: function() {
      this.show = false
    }
  },
  mounted() {
    let args = this.$route.query
    let player = this.$refs.player
    let chimee = new Chimee({
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
    chimee.load(args.url)
    chimee.play()
  }
}
</script>

<style lang="scss" scoped >
.player {
  width: 100%;
  height: 100%;
  background: black;
  border-radius: 5px;
  color: #fff;
  .close {
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 10;
  }
}
</style>

