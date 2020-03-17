<template>
  <div class="group">
    <div class="bar">
      <font-awesome-icon class="back" icon="arrow-left" @click="$emit('setting-back')" />
      <h3>{{$t('setting.title')}}</h3>
    </div>
    <div class="layout">
      <img src="../assets/ic_logo.webp" id="avatar" />
    </div>
    <span class="version">{{version}}</span>
    <div class="linear">
      <span class="item" @click="checkUpdate">{{$t('check_update')}}</span>
      <span
        class="item"
        @click="open('https://mixinmessenger.zendesk.com/hc/en-us')"
      >{{$t('help_center')}}</span>
      <span class="item" @click="open('https://mixin.one/pages/terms')">{{$t('terms_service')}}</span>
      <span class="item" @click="open('https://mixin.one/pages/privacy')">{{$t('privacy_policy')}}</span>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

import browser from '@/utils/browser'
import { ipcRenderer } from 'electron'

@Component
export default class SettingContainer extends Vue {
  group: boolean = false
  title: string = ''
  $electron: any

  get version() {
    let version = this.$t('version')
    return `${version} ${this.$electron.remote.app.getVersion()}`
  }

  checkUpdate() {
    ipcRenderer.send('checkUp')
  }
  open(url: string) {
    browser.loadURL(url)
  }
}
</script>
<style lang="scss" scoped>
.group {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  background: #f2f3f3;
  .bar {
    padding-top: 3rem;
    width: 100%;
    display: flex;
    height: 3rem;
    background: #ffffff;
    align-items: center;
    flex-flow: row nowrap;
    .back {
      padding: 0.8rem;
    }
    h3 {
      padding: 0.4rem;
    }
  }
  .layout {
    display: flex;
    width: 100%;
    padding-top: 0.8rem;
    padding-bottom: 0.8rem;
    justify-content: center;
    #avatar {
      width: 11.5rem;
      height: 8.5rem;
    }
  }
  .linear {
    display: flex;
    flex-direction: column;
    background: white;
    width: 100%;
    margin-top: 1rem;

    .item {
      font-weight: 500;
      padding: 0.8rem;
      border-bottom: 0.05rem solid $border-color;
      &:hover,
      &.current {
        background: #f0f0f0;
      }
    }
  }
  .version {
    color: #99a5ab;
    font-size: 0.7rem;
    font-weight: 500;
  }
}
</style>
