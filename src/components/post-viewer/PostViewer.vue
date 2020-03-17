<template>
  <transition name="modal">
    <div class="root" v-if="visible">
      <div class="bg"></div>
      <div class="post-viewer" :style="{top: showTitlebar ? '1.4rem' : ''}">
        <div class="header">
          <svg-icon style="font-size: 1.2rem" @click="close" icon-class="ic_close" />
        </div>
        <mixin-scrollbar>
          <div class="ul">
            <vue-markdown class="markdown" :source="post"></vue-markdown>
          </div>
        </mixin-scrollbar>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class PostViewer extends Vue {
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
  background: #ffffff;
}
.post-viewer {
  position: absolute;
  width: 100%;
  top: 0;
  bottom: 0;
  padding-top: 2.05rem;
  box-sizing: border-box;
  .header {
    position: absolute;
    top: 0;
    width: 100%;
    height: 2.05rem;
    line-height: 2.05rem;
    .svg-icon {
      font-size: 1.15rem;
      cursor: pointer;
      margin: 0.6rem 0.8rem 0;
      float: right;
    }
  }
  .markdown {
    margin: 0 auto;
    max-width: 40rem;
    padding: 0 0.8rem 1.6rem;
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
