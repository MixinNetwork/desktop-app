<template>
  <main>
    <div class="storage">
      <div class="bar">
        <font-awesome-icon class="back" icon="arrow-left" @click="back" />
        <h3>{{$t('storage_usage')}}</h3>
      </div>
      <!-- <Search id="storageContainerSearch" class="nav" @input="onInput" /> -->
      <div class="select" v-if="current">
        <div class="select-title">
          <span class="name">{{current.name}}</span>
          <a class="clear" @click="clear()">{{$t('setting.clear')}}</a>
        </div>
        <div class="select-item" v-for="key in Object.keys(currentMedia)" :key="key">
          <div class="type" @click="onSelected(key)">
            <svg-icon
              :icon-class="!unselected[key] ? 'ic_choice_selected' : 'ic_choice'"
              :class="{unselected: unselected[key]}"
              class="choice-icon"
            />
            {{$t(`chat.chat_${key}`)}}
          </div>
          <span class="size">{{currentMedia[key].toFixed(2)}} MB</span>
        </div>
      </div>
      <mixin-scrollbar v-else>
        <ul class="list">
          <div v-for="(item, i) in conversations" :key="i">
            <div
              class="conversation"
              @click="chooseConversation(item)"
              v-if="getStorage(item.conversationId)"
            >
              <Avatar :conversation="item" />
              <div class="content">
                <span class="name">{{item.groupName?item.groupName:item.name}}</span>
                <span class="size">{{getStorage(item.conversationId)}} MB</span>
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
import conversationDao from '@/dao/conversation_dao'
import participantDao from '@/dao/participant_dao'
import messageDao from '@/dao/message_dao'

import { delMedia, listFilePath, getIdentityNumber } from '@/utils/util'
import mediaPath from '@/utils/media_path'
import { Vue, Component, Prop } from 'vue-property-decorator'

const { getImagePath, getVideoPath, getAudioPath, getDocumentPath } = mediaPath

@Component({
  components: {
    Search,
    Avatar
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

  beforeMount() {
    Object.keys(this.storages).forEach((id: any) => {
      const conversation = conversationDao.getConversationItemByConversationId(id)
      if (conversation) {
        const participants = participantDao.getParticipantsByConversationId(id)
        conversation.participants = participants
        this.conversations.push(conversation)
      }
    })
  }

  back() {
    if (this.current) {
      this.current = null
    } else {
      this.$emit('back')
    }
  }

  onSelected(key: string) {
    const unselected = JSON.parse(JSON.stringify(this.unselected))
    unselected[key] = !unselected[key]
    this.unselected = unselected
  }

  clear() {
    let size = 0

    const messages: any = []
    const messageIds: any = []
    Object.keys(this.currentMedia).forEach(key => {
      if (!this.unselected[key]) {
        size += this.currentMedia[key]
        const curPath = this.getMediaPath(key, this.current.conversationId)
        const list = listFilePath(curPath)
        list.forEach(path => {
          messages.push({ path })
          const mid = path.split(`${curPath}/`)[1]
          if (mid) {
            messageIds.push(mid)
          }
        })
      }
    })

    this.$Dialog.alert(
      this.$t('setting.remove_messages', { 0: messages.length, 1: `(${size.toFixed(2)} MB)` }),
      this.$t('setting.clear'),
      () => {
        setTimeout(() => {
          delMedia(messages)
          messageDao.deleteMessageByIds(messageIds)
        })
        // TODO update view
        this.back()
      },
      this.$t('cancel'),
      () => {}
    )
  }

  get currentMedia() {
    const data = this.storages[this.current.conversationId]
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

  getStorage(id: string) {
    const storages: any = this.storages[id]
    let storage = 0
    Object.keys(storages).forEach(key => {
      storage += storages[key]
    })
    if (storage < 0.0001) {
      return 0
    }
    return storage.toFixed(2)
  }

  chooseConversation(item: any) {
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
      }
      .select-item {
        padding: 0.1rem 1rem 0.3rem 0.6rem;
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
