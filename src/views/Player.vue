<template>
  <div class="player" ref="player"></div>
</template>
<script>
import Chimee from 'chimee'
import ChimeeKernelHls from 'chimee-kernel-hls'

export default {
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
      poster: args.thumb
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
}
</style>

