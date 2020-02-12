<template>
  <transition name="modal">
    <div class="root" v-if="visible">
      <div class="mask"></div>
      <div class="post-viewer">
        <div class="header">
          <svg-icon @click="close" icon-class="ic_close" />
        </div>
        <mixin-scrollbar>
          <vue-markdown
            class="markdown ul"
            :anchorAttributes="{rel: 'noopener noreferrer nofollow', onclick: 'linkClick(this.href)'}"
            :source="post"
          ></vue-markdown>
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
.mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
}
.post-viewer {
  position: absolute;
  top: 0;
  width: 100%;
  height: calc(100vh - 2.6rem);
  .header {
    height: 2.6rem;
    line-height: 2.6rem;
    .svg-icon {
      font-size: 1.45rem;
      cursor: pointer;
      margin: 0.75rem 1rem 0;
      float: right;
    }
  }
  .markdown {
    margin: 0 auto;
    max-width: 50rem;
    padding: 0 1rem 2rem;
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
