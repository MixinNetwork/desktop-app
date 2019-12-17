<template>
  <div class="search">
    <div class="layout" :style="layoutStyle">
      <div class="icon" @click="back">
        <transition name="fade-rote">
          <font-awesome-icon icon="arrow-left" id="ic_arrow" v-show="focus" />
        </transition>
        <transition name="fade">
          <font-awesome-icon icon="search" id="ic_search" v-show="!focus" />
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
        />
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
      if (this.$refs.box.value === '') {
        this.focus = false
      }
    },
    back: function() {
      this.focus = false
      this.$refs.box.value = ''
      this.$emit('input', '')
    }
  },
  watch: {
    focus: function(newFocus, oldFocus) {
      if (newFocus) {
        this.searchColor = '#FFFFFF'
        this.layoutStyle['border-color'] = '#cccccc'
      } else {
        this.searchColor = '#FBFBFB'
        this.layoutStyle['border-color'] = '#f5f7fa'
      }
    }
  },
  data() {
    return {
      focus: false,
      layoutStyle: {
        width: '100%',
        display: 'flex',
        background: '#f5f7fa',
        'align-items': 'center',
        'padding-left': '16px',
        'padding-right': '16px',
        'padding-top': '8px',
        'padding-bottom': '8px',
        'border-width': '1px',
        'border-radius': '20px'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.box {
  margin-left: 8px;
  margin-right: 8px;
  border: none;
  flex-grow: 19;
  font-size: 1rem;
  &::-webkit-input-placeholder {
    color: #bbbec3;
  }
}

.icon {
  justify-content: center;
  align-items: center;
  display: flex;
  width: 18px;
  height: 18px;
}
.layout {
  input {
    background: transparent;
  }
}

#ic_arrow,
#ic_search {
  position: absolute;
  color: #bbbec3;
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
