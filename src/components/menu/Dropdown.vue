<template>
  <div class="btn-group">
    <a
      href="javascript:void(0)"
      class="dropdown-toggle"
      ref="search"
      :style="{ background: searchColor}"
      @focus="onFocus"
      @blur="onBlur"
    >
      <svg-icon icon-class="ic_down" />
    </a>
  </div>
</template>

<script lang="ts">

import { Vue, Prop, Watch, Component } from 'vue-property-decorator'

@Component
export default class Dropdown extends Vue {
  @Prop(Array) readonly menus: any

  showMenu: boolean = false
  searchColor: string = 'transparent'
  $Menu: any

  @Watch('showMenu')
  onShowMenuChange(newV: any, oldV: any) {
    if (newV !== oldV) {
      if (newV) {
        this.searchColor = '#D6D6D6'
        const rect = this.$el.getBoundingClientRect()
        this.$Menu.alert(
          rect.x - rect.width - 100,
          rect.top + rect.height + 3,
          this.menus,
          (index: number) => {
            this.$emit('onItemClick', index)
          },
          'right'
        )
      } else {
        this.searchColor = 'transparent'
      }
    }
  }

  activated() {
    this.showMenu = false
  }
  onFocus() {
    this.showMenu = true
  }
  onBlur() {
    this.showMenu = false
  }
}
</script>

 <style lang="scss" scoped>
.btn-group {
  position: relative;
  .afterLink > a:focus > span {
    border-bottom: 0.1rem solid green;
  }
}
.dropdown-toggle {
  display: flex;
  padding: 0.4rem;
  border-radius: 1rem;
}
</style>
