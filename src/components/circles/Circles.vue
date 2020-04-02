<template>
  <transition name="modal">
    <div class="root" v-if="visible">
      <div class="bg"></div>
      <div class="circles" :style="{top: showTitlebar ? '1.4rem' : ''}">
        <div class="header">
          <svg-icon style="font-size: 1.2rem" @click="close" icon-class="ic_close" />Circles
        </div>
        <mixin-scrollbar>
          <div class="ul">
            <CircleItem v-for="item in 3" :key="item" :item="item"></CircleItem>
          </div>
        </mixin-scrollbar>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import CircleItem from './CircleItem.vue'

@Component({
  components: {
    CircleItem
  }
})
export default class Circles extends Vue {
  post: any = ''
  visible: boolean = false

  get showTitlebar() {
    return process.platform === 'win32'
  }

  close() {
    this.visible = false
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
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: text;
}
.bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #33333377;
}
.circles {
  position: relative;
  z-index: 1000;
  width: 22.4rem;
  padding: 0.2rem 0 0.8rem;
  max-height: 72vh;
  overflow: hidden;
  list-style: none;
  font-size: 0.8rem;
  background-color: #fff;
  border-radius: 0.2rem;
  box-shadow: 0 0.2rem 0.6rem rgba(0, 0, 0, 0.195);
  .header,
  .title {
    padding: 0.8rem 1.25rem;
    font-size: 0.8rem;
    font-weight: 500;
    .svg-icon {
      font-size: 1.45rem;
      cursor: pointer;
    }
  }
  .list {
    font-size: 0.8rem;
    height: calc(72vh - 6.4rem);
  }
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
