<template>
  <div class="loading-icon" @click="$emit('userClick')">
    <svg-icon class="icon" icon-class="loading-stop-black" />
    <Spinner class="circle" color="#fff" />
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Spinner from '@/components/Spinner.vue'

@Component({
  components: {
    Spinner
  }
})
export default class LoadingIcon extends Vue {}
</script>

<style lang="scss" scoped>
.loading-icon {
  .icon {
    width: 100%;
    height: 100%;
    left: 0;
    z-index: 0;
    position: absolute;
    line-height: 100%;
    cursor: pointer;
  }
  .circle {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
}
</style>
