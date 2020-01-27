<template>
  <svg :class="svgClass" aria-hidden="true" v-on="$listeners">
    <use :xlink:href="iconName" />
  </svg>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'

@Component
export default class SvgIcon extends Vue {
  @Prop({ default: '', type: String })
  private iconClass!: string;

  @Prop({ default: '', type: String })
  private className!: string;

  private get iconName() {
    return `#icon-${this.iconClass}`
  }
  private get svgClass() {
    if (this.className) {
      return 'svg-icon ' + this.className
    } else {
      return 'svg-icon'
    }
  }
}
</script>

<style scoped>
.svg-icon {
  fill: currentColor;
  overflow: hidden;
  width: 1em;
  height: 1em;
  vertical-align: top;
}
</style>