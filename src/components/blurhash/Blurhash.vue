<template>
  <div ref="scroll" class="blurhash">
    <canvas ref="canvas" />
  </div>
</template>

<script lang="ts">
import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { encodeImageToBlurhash, decodeImageToCanvas } from './index'

@Component
export default class Blurhash extends Vue {
  @Prop(String) readonly image: any
  @Prop(Number) readonly width: any
  @Prop(Number) readonly height: any

  data: any = null

  mounted() {
    // this.data = await encodeImageToBlurhash(this.image)
    // const pixels = decodeImageToCanvas('UXC%BZbHIVs:4nayNGWB~pa}R*of4nayt6WB', 32, 32)
    const pixels = decodeImageToCanvas(this.image, this.width, this.height)
    const canvas: any = this.$refs.canvas
    const ctx: any = canvas.getContext('2d')
    canvas.width = this.width
    canvas.height = this.height
    const imageData = ctx.createImageData(this.width, this.height)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
  }
}
</script>

<style lang="scss">
.blurhash {
  position: absolute;
  cursor: default;
  width: 100%;
  height: 100%;
  top: 0;
  border-radius: 0.15rem;
}
</style>
