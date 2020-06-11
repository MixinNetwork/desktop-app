<template>
  <div class="lottie" ref="lottie"></div>
</template>
<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'

import lottie from 'lottie-web'

@Component
export default class Lottie extends Vue {
  @Prop(String) readonly path: any

  mounted() {
    setTimeout(() => {
      const animData: any = {
        container: this.$refs.lottie,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        rendererSettings: {
          progressiveLoad: true,
          preserveAspectRatio: 'xMidYMid meet'
        },
        path: this.path
      }
      let anim = lottie.loadAnimation(animData)
      anim.setSubframe(false)
    })
  }
}
</script>
<style lang="scss" scoped>
.lottie {
  display: inline-flex;
}
</style>
