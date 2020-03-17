<template>
  <v-titlebar
    :theme="theme"
    :platform="platform"
    :on-close="close"
    :on-maximize="toggleMaximize"
    :on-minimize="minimize"
    :is-maximizable="isMaximizable"
    :is-closable="isClosable"
    :is-minimizable="isMinimizable"
    :menu="menu"
    :show-icon="showIcon"
    :show-title="showTitle"
  >
    <template slot="icon">
      <img src="../../public/icon.png" alt="icon" />
    </template>

    <template slot="title">Mixin</template>
  </v-titlebar>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import { remote } from 'electron'

@Component
export default class TimeDivide extends Vue {
  platform: any = process.platform
  theme: any = 'light'
  isMaximizable: any = remote.getCurrentWindow().isMaximizable()
  isMinimizable: any = remote.getCurrentWindow().isMinimizable()
  isClosable: any = remote.getCurrentWindow().isClosable()
  showTitle: any = true
  showIcon: any = true
  menu: any = []
  close() {
    remote.getCurrentWindow().close()
  }
  toggleMaximize() {
    let win = remote.getCurrentWindow()
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
  minimize() {
    remote.getCurrentWindow().minimize()
  }
}
</script>
<style lang="scss" scoped>
/deep/ .titlebar-icon img {
  border-radius: 1rem;
  border: 0.05rem solid #f2f3f3;
}
</style>
