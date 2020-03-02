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

import { Getter, Action } from 'vuex-class'
import { ipcRenderer } from 'electron'

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
    ipcRenderer.on('menu-event', (event: Electron.IpcRendererEvent, { name }: { name: any }) => {
      switch (name) {
        case 'find':
          return this.actionSetSearching('key:')
        default:
      }
    })

    document.onmousemove = event => {
      this.$root.$emit('mousemove', event)
    }

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
        this.$root.$emit('tabKeyDown', 'navigationSearch')
      }
      if (ctrlKey) {
        if (keyCode === 69) {
          ipcRenderer.send('openDevTools')
        }
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
@import url('https://fonts.googleapis.com/css?family=Roboto+Condensed');

html,
body {
  padding: 0;
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  user-select: none;
  overflow: hidden;
  font-size: 20px;
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
      margin-top: 0.5rem;
    }
    .app_time_continue {
      margin-top: 0.8rem;
      height: 1.6rem;
      color: #2cc3fa;
      &:hover,
      &.current {
        color: #0d94fc;
      }
    }
    .app_time_loding {
      margin-top: 0.8rem;
      width: 1.6rem;
      height: 1.6rem;
    }
  }
}
.drag-bar {
  -webkit-app-region: drag;
  width: 100%;
  height: 2.4rem;
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
  &.default,
  &.mention {
    color: #3d75e3;
  }
  &.mention {
    cursor: pointer;
  }
  &.in-bubble {
    background: #c4ed7a;
    border-radius: 0.2rem;
  }
}
.markdown {
  word-break: break-word;
  line-height: 1.5;
  font-size: 0.8rem;
  font-weight: 400;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  * {
    outline: none;
    &:last-child {
      margin-bottom: 0 !important;
    }
    &:first-child {
      margin-top: 0 !important;
    }
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0.8rem 0;
    padding: 0;
  }
  dl,
  ol,
  ul,
  li,
  p,
  pre,
  blockquote {
    margin: 0 0 0.4rem;
    padding: 0;
  }
  ul {
    margin-left: 1.6rem;
    li {
      list-style: disc;
    }
  }
  ol {
    margin-left: 1.6rem;
    li {
      list-style: decimal;
    }
  }
  img {
    max-width: 100%;
  }
  pre {
    background: #f4f4f4;
    word-break: break-all;
    padding: 0.16rem 0.3rem;
    border-radius: 0.16rem;
    overflow: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  blockquote {
    border-left: 0.16rem solid #ddd;
    padding-left: 0.45rem;
    margin-left: 0.16rem;
  }
  a {
    color: #4b7ed2;
  }
  table {
    position: relative;
    table-layout: fixed;
    border-collapse: collapse;
    border-spacing: 0;
    word-wrap: break-word;
    word-break: normal;
    margin: 0;
    font-weight: 400;
    box-sizing: border-box;
    border: 1px solid #e2e2e2;
    width: 96%;
  }
  tbody,
  tr,
  th,
  td {
    margin: 0;
    font-weight: 400;
    box-sizing: border-box;
  }
  table tr td,
  table tr th {
    margin: 0;
    font-weight: 400;
    box-sizing: border-box;
    min-width: 90px;
    font-size: 14px;
    white-space: normal;
    word-wrap: break-word;
    border: 1px solid #e2e2e2;
    vertical-align: top;
    padding: 4px 8px;
  }
  th {
    background-color: #f6f6f6;
    font-weight: bold;
  }
}
</style>
