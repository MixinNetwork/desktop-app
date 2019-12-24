<template>
  <transition name="modal">
    <div
      class="root"
      v-if="show"
      @touchmove="notAllowTouchMove($event)"
      @contextmenu.prevent="dismiss($event)"
    >
      <div class="mask" @click="dismiss($event)"></div>
      <ul class="dropdown-menu" :style="position">
        <li v-for="(menu,index) in menus" :key="index" @click="onItemClick(index)">
          <a>{{ menu }}</a>
        </li>
      </ul>
    </div>
  </transition>
</template>
<script>
export default {
  data() {
    return {
      show: false,
      closable: true,
      menus: [],
      x: 0,
      y: 0,
      onItemClick: {}
    }
  },
  computed: {
    position: function() {
      const { x, y } = this
      return {
        top: y + 'px',
        left: x + 'px'
      }
    }
  },
  methods: {
    dismiss(event) {
      if (!this.closable && event.target.getAttribute('role') !== 'close-button') {
        return
      }
      this.show = false
      document.body.style.overflow = 'auto'
    },
    notAllowTouchMove(event) {
      event.preventDefault()
    }
  }
}
</script>

<style lang="scss" scoped>
.root {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
  z-index: 9999;
}
.mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.dropdown-menu {
  position: relative;
  z-index: 1000;
  float: left;
  min-width: 160px;
  padding: 5px 0;
  margin: 2px 0 0;
  list-style: none;
  font-size: 14px;
  text-align: left;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
  background-clip: padding-box;
}
.dropdown-menu > li > a {
  cursor: pointer;
  padding: 10px 30px;
  display: block;
  clear: both;
  font-weight: bold;
  line-height: 1.6;
  color: #333333;
  white-space: nowrap;
  text-decoration: none;
  color: #4b4b4b;
}
.dropdown-menu > li > a:hover {
  background: #f4f5f5;
}
.dropdown-menu > li {
  overflow: hidden;
  width: 100%;
  position: relative;
  margin: 0;
}
li {
  list-style: none;
}
.modal-enter {
  opacity: 0;
}
.modal-leave-active {
  opacity: 0;
}
.modal-enter .modal-container,
.modal-leave-active .modal-container {
  transform: scale(1.1);
}
</style>
