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
      <span class="item storage" @click="manageStorage">
        {{$t('data_storage')}}
      </span>
      <span class="item" @click="checkUpdate">{{$t('check_update')}}</span>
      <span
        class="item"
        @click="open('https://mixinmessenger.zendesk.com/hc/en-us')"
      >{{$t('help_center')}}</span>
      <span class="item" @click="open('https://mixin.one/pages/terms')">{{$t('terms_service')}}</span>
      <span class="item" @click="open('https://mixin.one/pages/privacy')">{{$t('privacy_policy')}}</span>
    </div>
    <transition name="slide-right">
      <StorageContainer
        class="overlay"
        :storages="storages"
        v-show="storageView"
        @back="storageBack"
      ></StorageContainer>
    </transition>
  </div>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import StorageContainer from '@/components/StorageContainer.vue'

import browser from '@/utils/browser'
import { ipcRenderer, remote } from 'electron'

import { getIdentityNumber, dirSize } from '@/utils/util'

import fs from 'fs'
import path from 'path'

@Component({
  components: {
    StorageContainer
  }
})
export default class SettingContainer extends Vue {
  group: boolean = false
  title: string = ''
  $electron: any

  storageUsage: number = 0
  storageView: boolean = false
  storages: any = {}

  created() {
    const identityNumber = getIdentityNumber(true)
    const newDir = path.join(remote.app.getPath('userData'), identityNumber)
    const dirsMap: any = dirSize(newDir)
    this.storageUsage = dirsMap[newDir]
    Object.keys(dirsMap).forEach(dir => {
      const subDir = dir.split(`${newDir}/Media`)[1]
      if (subDir) {
        const type = this.getMediaType(subDir)
        if (!type) return
        const pieces = subDir.split('/')
        const conversationId = pieces[pieces.length - 1]

        this.storages[conversationId] = this.storages[conversationId] || {}
        this.storages[conversationId][type] = dirsMap[dir]
      }
    })
  }

  getMediaType(dir: string) {
    if (dir.includes('/Images/')) {
      return 'image'
    }
    if (dir.includes('/Videos/')) {
      return 'video'
    }
    if (dir.includes('/Audios/')) {
      return 'audio'
    }
    if (dir.includes('/Files/')) {
      return 'file'
    }
    return ''
  }

  get version() {
    let version = this.$t('version')
    return `${version} ${this.$electron.remote.app.getVersion()}`
  }

  checkUpdate() {
    ipcRenderer.send('checkUp')
  }

  backupRestore() {}

  manageStorage() {
    this.storageView = true
  }

  storageBack() {
    this.storageView = false
  }

  open(url: string) {
    browser.loadURL(url, '')
  }
}
</script>
<style lang="scss" scoped>
.group {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  background: $bg-color;
  .bar {
    padding-top: 3rem;
    width: 100%;
    display: flex;
    height: 3rem;
    background: #ffffff;
    align-items: center;
    flex-flow: row nowrap;
    .back {
      cursor: pointer;
      padding: 0.8rem 0.2rem 0.8rem 1rem;
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
      cursor: pointer;
      font-weight: 500;
      padding: 0.8rem;
      border-bottom: 0.05rem solid $border-color;
      &:hover,
      &.current {
        background: $hover-bg-color;
      }
      line-height: 1;
      small {
        font-weight: normal;
        line-height: 1;
        color: $light-font-color;
      }
    }
  }
  .version {
    color: #99a5ab;
    font-size: 0.7rem;
    font-weight: 500;
  }
}
.overlay {
  z-index: 10;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  top: 0;
  left: 0;
}
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}
.slide-right-enter,
.slide-right-leave-to {
  transform: translateX(200%);
}
</style>
