<template>
  <div ref="blurhash" class="blurhash">
    <canvas ref="canvas" />
  </div>
</template>

<script lang="ts">
import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { encodeImageToBlurhash, decodeImageToCanvas } from './index'

@Component
export default class Blurhash extends Vue {
  @Prop(String) readonly image: any
  @Prop(String) readonly mediaUrl: any

  data: any = null

  async mounted() {
    const target: any = this.$refs.blurhash
    const width = target.offsetWidth
    const height = target.offsetHeight
    // // encode demo, too slow
    // this.data = await encodeImageToBlurhash(this.mediaUrl)
    // this.data = 'UGHn:600%L%g8^MxNbo}~pxvS6V?00kWxaix'
    // const pixels = decodeImageToCanvas(this.data, width, height)
    const pixels = decodeImageToCanvas(this.image, width, height)
    const canvas: any = this.$refs.canvas
    const ctx: any = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height
    const imageData = ctx.createImageData(width, height)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
  }
}
</script>

<style lang="scss">
.blurhash {
  position: absolute;
  cursor: default;
  overflow: hidden;
  width: 100%;
  height: 100%;
  top: 0;
  border-radius: 0.15rem;
}
</style>
