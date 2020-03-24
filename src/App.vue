<template>
  <div id="app">
    <div class="drag-bar" />
    <router-view />
    <div class="app_time" v-show="showTime">
      <img src="./assets/ic_logo.webp" class="app_time_logo" />
      <span class="app_time_info">{{$t('time_wrong')}}</span>
      <span class="app_time_continue" @click="ping" v-show="!isLoading">{{$t('continue')}}</span>
      <spinner class="app_time_loding" v-if="isLoading" />
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import spinner from '@/components/Spinner.vue'
import accountApi from '@/api/account'

import log from 'electron-log'

import { Getter, Action } from 'vuex-class'
import { ipcRenderer } from 'electron'

ipcRenderer.on('menu-event', (event: Electron.IpcRendererEvent, { name }: { name: any }) => {
  switch (name) {
    case 'devtool':
      return ipcRenderer.send('openDevTools')
    default:
  }
})

process.on('uncaughtException', err => {
  log.error(err.stack)
})

window.onerror = (message, source, lineno, colno, err: any) => {
  log.error(err.stack || err)
}

// @ts-ignore
window.linkClick = href => {
  // browser.loadURL(href)
  // // @ts-ignore
  // event.preventDefault()
  // @ts-ignore
  event.stopPropagation()
}

@Component({
  components: {
    spinner
  }
})
export default class App extends Vue {
  @Getter('showTime') showTime: any

  @Action('setSearching') actionSetSearching: any

  isLoading: boolean = false
  $postViewer: any

  created() {
    let directionKeyDownTimeout: any = null
    document.onkeydown = e => {
      let keyCode = e.keyCode
      let ctrlKey = e.ctrlKey || e.metaKey
      const maskDom = document.querySelector('.mask.sp')
      if (maskDom) {
        if (!ctrlKey || (ctrlKey && keyCode >= 37 && keyCode <= 40)) {
          if (keyCode === 38) {
            this.$root.$emit('directionKeyDownInMenu', 'up')
          }
          if (keyCode === 40) {
            this.$root.$emit('directionKeyDownInMenu', 'down')
          }
        }
        return e.preventDefault()
      }
      if (keyCode === 9) {
        e.preventDefault()
      }
      if (ctrlKey) {
        if (keyCode === 70) {
          this.actionSetSearching('key:')
        }
        clearTimeout(directionKeyDownTimeout)
      }
      if (keyCode === 38) {
        directionKeyDownTimeout = setTimeout(() => {
          this.$root.$emit('directionKeyDown' + (ctrlKey ? 'WithCtrl' : ''), 'up')
        }, 10)
      }
      if (keyCode === 40) {
        directionKeyDownTimeout = setTimeout(() => {
          this.$root.$emit('directionKeyDown' + (ctrlKey ? 'WithCtrl' : ''), 'down')
        }, 10)
      }
    }
    document.onkeyup = e => {
      let keyCode = e.keyCode
      if (keyCode === 27) {
        this.$postViewer.hide()
        this.$root.$emit('escKeydown')
      }
    }
  }
  ping() {
    this.isLoading = true
    accountApi.checkPing().then(
      (resp: any) => {
        this.isLoading = false
      },
      (err: any) => {
        console.log(err)
        this.isLoading = false
      }
    )
  }
}
</script>

<style lang="scss">
@import './assets/scss/common';
</style>
