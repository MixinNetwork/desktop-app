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

import browser from '@/utils/browser'
import spinner from '@/components/Spinner.vue'
import accountApi from '@/api/account'

import { Getter, Action } from 'vuex-class'
import { ipcRenderer } from 'electron'

// @ts-ignore
window.linkClick = (href) => {
  browser.loadURL(href)
  // @ts-ignore
  event.preventDefault()
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
    ipcRenderer.on('menu-event', (event: Electron.IpcRendererEvent, { name }: { name: any }) => {
      switch (name) {
        case 'find':
          return this.actionSetSearching('key:')
        default:
      }
    })

    document.onkeydown = e => {
      let keyCode = e.keyCode
      let ctrlKey = e.ctrlKey || e.metaKey
      if (ctrlKey) {
        if (keyCode === 69) {
          ipcRenderer.send('openDevTools')
        }
        if (keyCode === 70) {
          this.actionSetSearching('key:')
        }
      }
      if (keyCode === 27) {
        this.$postViewer.hide()
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
@import url('https://fonts.googleapis.com/css?family=Roboto+Condensed');

html,
body {
  padding: 0;
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  user-select: none;
  overflow: hidden;
  font-size: 1rem;
}
button {
  -webkit-app-region: no-drag;
}
input:focus,
select:focus,
textarea:focus,
button:focus {
  outline: none;
}
a {
  color: #5252de;
  text-decoration: none;
}
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;

  .app_time {
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    position: absolute;
    z-index: 100;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    .app_time_logo {
      width: 45vw;
      height: 33.6vw;
    }
    .app_time_info {
      margin-top: 0.625rem;
    }
    .app_time_continue {
      margin-top: 1rem;
      height: 2rem;
      color: #2cc3fa;
      &:hover,
      &.current {
        color: #0d94fc;
      }
    }
    .app_time_loding {
      margin-top: 1rem;
      width: 2rem;
      height: 2rem;
    }
  }
}
.drag-bar {
  -webkit-app-region: drag;
  width: 100%;
  height: 3rem;
  position: absolute;
  top: 0;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
audio,
video {
  outline: none;
}
b.highlight {
  font-weight: normal;
  &.default {
    color: #3d75e3;
  }
  &.in-bubble {
    background: #c4ed7a;
    border-radius: 0.25rem;
  }
}
.markdown {
  word-break: break-word;
  line-height: 1.5;
  font-size: 1rem;
  font-weight: 400;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  outline: none;

  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  h7 {
    margin: 0 0 1rem;
    padding: 0;
  }
  p,
  pre,
  blockquote {
    margin: 0 0 0.5rem;
    padding: 0;
  }
  img {
    max-width: 100%;
  }
  pre {
    background: #f4f4f4;
    word-break: break-all;
    padding: 0.2rem 0.4rem;
    border-radius: 0.2rem;
    overflow: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  blockquote {
    border-left: 0.2rem solid #ddd;
    padding-left: 0.6rem;
    margin-left: 0.2rem;
  }
  a {
    color: #4b7ed2;
  }
}
</style>
