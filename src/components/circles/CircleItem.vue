<template>
  <div class="circle">
    <div class="root">circle</div>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component({
  components: {}
})
export default class StickerItem extends Vue {
  @Prop(Object) readonly item: any

  mounted() {}
}
</script>
<style lang="scss" scoped>
.circle {
  padding: 0.4rem 1.25rem;
  .root {
  }
}
</style>
