<template>
  <main>
    <div class="storage">
      <div class="bar">
        <font-awesome-icon class="back" icon="arrow-left" @click="back" />
        <h3 v-if="storagePage">{{$t('storage_usage')}}</h3>
        <h3 v-else>{{$t('data_storage')}}</h3>
      </div>
      <div class="setting select" v-if="!storagePage">
        <div class="title">{{$t('automatic_download')}}</div>
        <div
          class="item select-item"
          @click="autoDownloadSelected(key)"
          v-for="key in ['image', 'video', 'file']"
          :key="key"
        >
          {{$t('chat.chat_'+key)}}
          <svg-icon
            :icon-class="autoDownloadMap[key] ? 'ic_choice_selected' : 'ic_choice'"
            :class="{unselected: !autoDownloadMap[key]}"
            class="choice-icon"
          />
        </div>
        <div class="info">{{$t('storage_info')}}</div>
        <div class="item" @click="storagePage = true">{{$t('storage_usage')}}</div>
      </div>
      <div class="select" v-else-if="current">
        <div class="select-title">
          <span class="name">{{current.groupName || current.name}}</span>
          <spinner v-if="cleaning" class="cleaning" stroke="#aaa" />
          <a v-else class="clear" @click="clear()">{{$t('setting.clear')}}</a>
        </div>
        <div class="select-item" v-for="key in ['image', 'video', 'audio', 'file']" :key="key">
          <div class="type" @click="onSelected(key)">
            <svg-icon
              :icon-class="!unselected[key] ? 'ic_choice_selected' : 'ic_choice'"
              :class="{unselected: unselected[key]}"
              class="choice-icon"
            />
            {{$t(`chat.chat_${key}`)}}
          </div>
          <span class="size">{{getSizeStr(currentMedia[key])}}</span>
        </div>
      </div>
      <mixin-scrollbar v-else>
        <ul class="list">
          <div v-for="(item, i) in conversations" :key="i">
            <div
              class="conversation"
              @click="chooseConversation(item)"
              v-if="getSize(item.conversationId)"
            >
              <Avatar :conversation="item" />
              <div class="content">
                <span class="name">{{item.groupName?item.groupName:item.name}}</span>
                <span class="size">{{getSizeStr(getSize(item.conversationId))}}</span>
              </div>
            </div>
          </div>
        </ul>
      </mixin-scrollbar>
    </div>
  </main>
</template>
<script lang="ts">
import Search from '@/components/Search.vue'
import Avatar from '@/components/Avatar.vue'
import spinner from '@/components/Spinner.vue'
import conversationDao from '@/dao/conversation_dao'
import participantDao from '@/dao/participant_dao'
import messageDao from '@/dao/message_dao'

import { delMediaMessages, listFilePath, getIdentityNumber } from '@/utils/util'
import mediaPath from '@/utils/media_path'
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'

// @ts-ignore
import _ from 'lodash'

import { ipcRenderer } from 'electron'

const { getImagePath, getVideoPath, getAudioPath, getDocumentPath } = mediaPath

@Component({
  components: {
    Search,
    Avatar,
    spinner
  }
})
export default class StorageContainer extends Vue {
  @Prop(Object) readonly storages: any

  keyword: any = ''
  // $toast: any
  $Dialog: any
  conversations: any = []
  current: any = null
  unselected: any = {}
  cleaningTemp: any = {}
  autoDownloadMap: any = {
    image: true,
    video: true,
    file: true
  }
  storagePage: boolean = false
  cleaning: boolean = false

  @Watch('autoDownloadMap')
  onAutoDownloadMapChanged(val: any) {
    localStorage.setItem('autoDownloadSetting', JSON.stringify(val))
  }

  beforeMount() {
    const conversations: any = []
    Object.keys(this.storages).forEach((id: any) => {
      const conversation = conversationDao.getConversationItemByConversationId(id)
      if (conversation) {
        const participants = participantDao.getParticipantsByConversationId(id)
        conversation.participants = participants
        const { image = 0, video = 0, audio = 0, file = 0 } = this.storages[id]
        const size = image + video + audio + file
        conversation.size = size
        conversations.push(conversation)
      }
    })
    this.conversations = _.orderBy(conversations, ['size'], ['desc'])
    const autoDownloadSetting = localStorage.getItem('autoDownloadSetting')
    if (autoDownloadSetting) {
      this.autoDownloadMap = JSON.parse(autoDownloadSetting)
    }
  }

  mounted() {
    ipcRenderer.on('taskResponseData', (event, res) => {
      const payload = JSON.parse(res)
      const { action, cid } = payload
      if (action === 'delMedia') {
        const mediaTypes = this.cleaningTemp[cid]
        if (mediaTypes) {
          mediaTypes.forEach((key: string) => {
            this.storages[cid][key] = 0
          })
        }
        if (cid === this.curCid) {
          this.cleaning = false
          this.back()
        }
      }
    })
  }

  back() {
    if (this.current) {
      this.storagePage = true
      this.current = null
    } else if (this.storagePage) {
      this.storagePage = false
    } else {
      this.$emit('back')
    }
  }

  onSelected(key: string) {
    const unselected = JSON.parse(JSON.stringify(this.unselected))
    unselected[key] = !unselected[key]
    this.unselected = unselected
  }

  autoDownloadSelected(key: string) {
    const autoDownloadMap = JSON.parse(JSON.stringify(this.autoDownloadMap))
    autoDownloadMap[key] = !autoDownloadMap[key]
    this.autoDownloadMap = autoDownloadMap
  }

  clear() {
    let size = 0

    const messages: any = []
    const messageIds: any = []
    const mediaTypes: any = []
    Object.keys(this.currentMedia).forEach(key => {
      if (!this.unselected[key]) {
        mediaTypes.push(key)
        size += this.currentMedia[key]
        if (this.curCid) {
          const curPath = this.getMediaPath(key, this.curCid)
          const list = listFilePath(curPath)
          list.forEach(path => {
            const mid = path.split(`${curPath}/`)[1]
            if (mid) {
              messageIds.push(mid)
            }
            messages.push({ path, mid, cid: this.curCid })
          })
        }
      }
    })

    this.$Dialog.alert(
      this.$t('setting.remove_messages', { 0: messages.length, 1: `(${this.getSizeStr(size)})` }),
      this.$t('setting.clear'),
      () => {
        this.cleaning = true
        this.cleaningTemp[this.curCid] = mediaTypes
        delMediaMessages(messages)
      },
      this.$t('cancel'),
      () => {}
    )
  }

  get curCid() {
    return this.current && this.current.conversationId
  }

  get currentMedia() {
    const data = this.storages[this.curCid] || {}
    data.image = data.image || 0
    data.video = data.video || 0
    data.audio = data.audio || 0
    data.file = data.file || 0
    return data
  }

  getMediaPath(type: string, conversationId: string) {
    let path = ''
    const identityNumber = getIdentityNumber(true)
    switch (type) {
      case 'image':
        path = getImagePath(identityNumber, conversationId)
        break
      case 'video':
        path = getVideoPath(identityNumber, conversationId)
        break
      case 'audio':
        path = getAudioPath(identityNumber, conversationId)
        break
      case 'file':
        path = getDocumentPath(identityNumber, conversationId)
        break
      default:
    }
    return path
  }

  getSize(id: string) {
    const sizes: any = this.storages[id]
    let size = 0
    Object.keys(sizes).forEach(key => {
      size += sizes[key]
    })
    if (size < 0.005) {
      return 0
    }
    return size
  }

  getSizeStr(size: any) {
    let unitStr = 'MB'
    if (size >= 1024) {
      size = size / 1024
      unitStr = 'GB'
    }
    return `${size.toFixed(2)} ${unitStr}`
  }

  chooseConversation(item: any) {
    this.cleaning = false
    this.unselected = {}
    this.current = item
  }

  onInput(text: string) {
    this.keyword = text
  }
}
</script>
<style lang="scss" scoped>
main {
  background: $bg-color;
  .storage {
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
    .bar {
      padding-top: 2.6rem;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 2.5rem;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        cursor: pointer;
        padding: 0.8rem 0.2rem 0.8rem 1.15rem;
      }
      h3 {
        padding: 0.4rem;
      }
    }
    .nav {
      z-index: 10;
      background: $hover-bg-color;
      border-top: 0.05rem solid $border-color;
      box-shadow: 0 0.05rem 0.05rem #99999933;
      padding: 0.35rem 0.6rem;
      display: flex;
      align-items: center;
    }
    .setting {
      background: #ffffff;
      padding-bottom: 0.6rem;
      .title {
        padding: 0.6rem 1rem;
        font-weight: 500;
      }
      .item.select-item {
        padding: 0.5rem 0.8rem 0.1rem 1rem;
      }
      .info {
        padding: 0.6rem;
        font-size: 0.6rem;
        text-align: center;
        color: #999;
      }
    }
    .setting .item,
    .conversation {
      cursor: pointer;
      background: #ffffff;
      padding: 0.6rem 1rem;
      &:hover {
        background: $hover-bg-color;
      }
      display: flex;
      .content {
        display: flex;
        flex-direction: column;
        padding-left: 0.6rem;
        .name {
          line-height: 1rem;
          white-space: nowrap;
          overflow: hidden;
          max-width: 9.5rem;
          text-overflow: ellipsis;
        }
        .size {
          padding-top: 0.2rem;
          font-size: 0.65rem;
          color: $light-font-color;
        }
      }
    }
    .select {
      padding-bottom: 1.2rem;
      background: #ffffff;
      .select-title {
        padding: 0.6rem 1rem 1.2rem;
        display: flex;
        justify-content: space-between;
        .name {
          max-width: 75%;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .clear {
          cursor: pointer;
        }
        .cleaning {
          width: 1.1rem;
          height: 1.1rem;
          font-size: 0.7rem;
          color: $gray-color;
        }
      }
      .select-item {
        padding: 0.2rem 1rem 0.2rem 0.6rem;
        display: flex;
        justify-content: space-between;
        .choice-icon {
          font-size: 1.5rem;
          margin-top: 0.1rem;
          &.unselected {
            margin-top: 0;
            margin-bottom: 0.1rem;
          }
        }
        .type {
          cursor: pointer;
          line-height: 1.1rem;
        }
        .size {
          padding-top: 0.1rem;
          font-size: 0.7rem;
          color: $light-font-color;
        }
      }
    }
  }
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
