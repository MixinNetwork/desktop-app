<template>
  <div class="edit">
    <div v-if="currentCircle || circle">
      like forward
      {{circle}}
    </div>
    <div v-else>
      // TODO input name first
      <button @click="createCircle">Ok</button>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component({
  components: {}
})
export default class StickerItem extends Vue {
  @Prop(Object) readonly circle: any

  currentCircle: any = null

  createCircle() {
    this.currentCircle = { name: 'input' }
  }
}
</script>
<style lang="scss" scoped>
.edit {
  padding: 0.4rem 1.25rem;
}
</style>
