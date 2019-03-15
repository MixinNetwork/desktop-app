<template>
  <div class="search" v-bind:style="{ background: searchColor}">
    <div class="layout" v-bind:style="layoutStyle">
      <div class="icon">
        <transition name="fade-rote">
          <font-awesome-icon icon="arrow-left" id="ic_arrow" v-show="focus"/>
        </transition>
        <transition name="fade">
          <font-awesome-icon icon="search" id="ic_search" v-show="!focus"/>
        </transition>
      </div>
      <keep-alive>
        <input
          class="box"
          ref="box"
          type="text"
          placeholder="Search"
          @focus="onFocus"
          @blur="onBlur"
          @input="$emit('input', $event.target.value)"
        >
      </keep-alive>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Search',
  methods: {
    onFocus: function() {
      this.focus = true
    },
    onBlur: function() {
      this.focus = false
      this.$refs.box.value = ''
    }
  },
  watch: {
    focus: function(newFocus, oldFocus) {
      if (newFocus) {
        this.searchColor = '#FFFFFF'
        this.layoutStyle['border-color'] = '#FFFFFF'
      } else {
        this.searchColor = '#FBFBFB'
        this.layoutStyle['border-color'] = '#F6F6F6'
      }
    }
  },
  data() {
    return {
      focus: false,
      searchColor: '#FBFBFB',
      layoutStyle: {
        width: '100%',
        display: 'flex',
        'align-items': 'center',
        'padding-left': '16px',
        'padding-right': '16px',
        'padding-top': '8px',
        'padding-bottom': '8px',
        border: '2px solid',
        'border-color': '#F6F6F6',
        'border-width': '1px',
        'border-radius': '4px',
        background: 'white'
      }
    }
  }
}
</script>

<style lang="scss">
.box {
  margin-left: 8px;
  margin-right: 8px;
  border: none;
  flex-grow: 19;
}

.icon {
  justify-content: center;
  align-items: center;
  display: flex;
  width: 16px;
  height: 16px;
}

#ic_arrow,
#ic_search {
  position: absolute;
}
.fade-rote-enter-active,
.fade-rote-leave-active {
  transition: all 0.5s;
}
.fade-rote-enter,
.fade-rote-leave-to {
  opacity: 0;
  transform: rotate(-90deg);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
