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
<script>
import browser from '@/utils/browser'
import { ipcRenderer } from 'electron'
export default {
  components: {},
  data: function() {
    return {
      group: false,
      title: ''
    }
  },
  computed: {
    version: function() {
      let version = this.$t('version')
      return `${version} ${this.$electron.remote.app.getVersion()}`
    }
  },
  methods: {
    checkUpdate() {
      ipcRenderer.send('checkUp')
    },
    open(url) {
      browser.loadURL(url)
    }
  }
}
</script>
<style lang="scss" scoped>
.group {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  background: #f5f7fa;
  .bar {
    padding-top: 3.75rem;
    width: 100%;
    display: flex;
    height: 3.75rem;
    background: #ffffff;
    align-items: center;
    flex-flow: row nowrap;
    .back {
      padding: 1rem;
    }
    h3 {
      padding: 0.5rem;
    }
  }
  .layout {
    display: flex;
    width: 100%;
    padding-top: 1rem;
    padding-bottom: 1rem;
    justify-content: center;
    #avatar {
      width: 225px;
      height: 168px;
    }
  }
  .linear {
    display: flex;
    flex-direction: column;
    background: white;
    width: 100%;
    margin-top: 1.25rem;

    .item {
      font-weight: 500;
      padding: 1rem;
      border-bottom: 1px solid $border-color;
      &:hover,
      &.current {
        background: #f1f2f2;
      }
    }
  }
  .version {
    color: #99a5ab;
    font-size: 0.92rem;
    font-weight: 500;
  }
}
</style>
