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
      <ICDown></ICDown>
    </a>
  </div>
</template>

<script>
import ICDown from '@/assets/images/ic_down.svg'
export default {
  name: 'Dropdown',
  props: ['menus'],
  data() {
    return {
      showMenu: false,
      searchColor: 'transparent'
    }
  },
  components: {
    ICDown
  },
  activated() {
    this.showMenu = false
  },
  watch: {
    showMenu: function(newV, oldV) {
      if (newV !== oldV) {
        if (newV) {
          this.searchColor = '#D6D6D6'
          var rect = this.$el.getBoundingClientRect()
          this.$Menu.alert(rect.x - rect.width - 100, rect.top + rect.height + 3, this.menus, index => {
            this.$emit('onItemClick', index)
          })
        } else {
          this.searchColor = 'transparent'
        }
      }
    }
  },
  methods: {
    onFocus() {
      this.showMenu = true
    },
    onBlur() {
      this.showMenu = false
    }
  }
}
</script>

 <style lang="scss" scoped>
.btn-group {
  position: relative;
  .afterLink > a:focus > span {
    border-bottom: 2px solid green;
  }
}
.dropdown-toggle {
  display: flex;
  padding: 8px;
  border-radius: 20px;
}
</style>
