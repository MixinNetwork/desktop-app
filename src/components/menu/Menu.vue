<template>
  <transition name="modal">
    <div
      class="root"
      v-if="show"
      @touchmove="notAllowTouchMove($event)"
      @contextmenu.prevent="dismiss($event)"
    >
      <div class="mask sp" @click="dismiss($event)"></div>
      <ul class="dropdown-menu" :style="position">
        <li v-for="(menu,index) in menus" :key="index" @click="onItemClick(index)">
          <a>{{ menu }}</a>
        </li>
      </ul>
    </div>
  </transition>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class Menu extends Vue {
  show: any = false
  closable: any = true
  menus: any = []
  x: any = 0
  y: any = 0
  onItemClick: any = {}

  get position() {
    const { x, y } = this
    return {
      top: y + 'px',
      left: x + 'px'
    }
  }

  dismiss(event: any) {
    if (!this.closable && event.target.getAttribute('role') !== 'close-button') {
      return
    }
    this.show = false
    document.body.style.overflow = 'auto'
  }
  notAllowTouchMove(event: any) {
    event.preventDefault()
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
  position: absolute;
  z-index: 1000;
  min-width: 8rem;
  padding: 0.25rem 0;
  margin: 0.1rem 0 0;
  list-style: none;
  font-size: 0.7rem;
  text-align: left;
  background-color: #fff;
  border: 0.05rem solid #ddd;
  border-radius: 0.2rem;
  box-shadow: 0 0.3rem 0.6rem rgba(0, 0, 0, 0.155);
  background-clip: padding-box;
}
.dropdown-menu > li > a {
  cursor: pointer;
  padding: 0.5rem 1.5rem;
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
