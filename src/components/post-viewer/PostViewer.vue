<template>
  <transition name="modal">
    <div class="root" v-if="visible">
      <div class="mask"></div>
      <div class="post-viewer">
        <div class="header">
          <svg-icon @click="close" icon-class="ic_close" />
        </div>
        <mixin-scrollbar>
          <VueMarkdown class="markdown ul" :source="post"></VueMarkdown>
        </mixin-scrollbar>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

import VueMarkdown from 'vue-markdown'

@Component({
  name: 'postViewer',
  components: {
    VueMarkdown
  }
})
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
      margin: 0.5rem 1rem;
      float: right;
    }
  }
  .markdown {
    padding: 0 1rem;
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
