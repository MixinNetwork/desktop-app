<template>
  <transition name="modal">
    <div class="root">
      <div class="mask"></div>
      <div class="message-forward">
        <div class="header">
          <svg-icon @click="$emit('close')" icon-class="ic_close" />
          {{$t('chat.share_with')}}
        </div>
        <div class="forward-search">
          <Search @input="onSearch" />
        </div>
        <div
          class="title"
        >{{showContactTitleFixed ? $t('chat.chat_contact') : $t('chat.recent_chat')}}</div>
        <div class="list">
          <mixin-scrollbar>
            <div class="ul">
              <ChatItem
                v-for="chat in chatList"
                :key="chat.conversationId"
                :chat="chat"
                :keyword="keyword"
                @item-click="onChatClick"
              ></ChatItem>
              <div class="title" id="contactTitle">{{$t('chat.chat_contact')}}</div>
              <UserItem
                v-for="user in contactList"
                :key="user.user_id"
                :user="user"
                :keyword="keyword"
                @user-click="onUserClick"
              ></UserItem>
            </div>
          </mixin-scrollbar>
        </div>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

import Search from '@/components/Search.vue'
import UserItem from '@/components/UserItem.vue'
import ChatItem from '@/components/ChatItem.vue'

import conversationDao from '@/dao/conversation_dao'
import userDao from '@/dao/user_dao'
import participantDao from '@/dao/participant_dao'

import { Getter, Action } from 'vuex-class'
import { MessageStatus, ConversationCategory } from '@/utils/constants'

@Component({
  components: {
    Search,
    UserItem,
    ChatItem
  }
})
export default class MessageForward extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Object) readonly category: any
  @Prop(Object) readonly me: any

  @Getter('currentConversation') conversation: any
  @Getter('getConversations') conversations: any
  @Getter('findFriends') friends: any

  @Action('sendMessage') actionSendMessage: any
  @Action('sendStickerMessage') actionSendStickerMessage: any
  @Action('sendAttachmentMessage') actionSendAttachmentMessage: any

  contacts: any[] = []
  chats: any[] = []
  keyword: string = ''
  observer: any
  beforeContactTitleTop: number = 0
  showContactTitleFixed: boolean = false
  MessageStatus: any = MessageStatus

  sendMessage() {
    setTimeout(() => {
      const message = this.message
      const { conversationId, appId } = this.conversation
      const msg: any = {}
      const status: any = MessageStatus.SENDING

      if (message.type.endsWith('_STICKER')) {
        const { stickerId } = message
        const category = appId ? 'PLAIN_STICKER' : 'SIGNAL_STICKER'
        const msg = {
          conversationId,
          stickerId,
          category,
          status
        }
        this.actionSendStickerMessage(msg)
      } else if (message.type.endsWith('_CONTACT')) {

      } else if (this.isFileType(message.type)) {
        let { mediaUrl, mediaMimeType } = message
        if (/^file:\/\//.test(mediaUrl)) {
          mediaUrl = mediaUrl.split('file://')[1]
        }

        const typeEnds = message.type.split('_')[1]
        const category = (appId ? 'PLAIN_' : 'SIGNAL_') + typeEnds
        const msg = {
          conversationId,
          mediaUrl,
          mediaMimeType,
          category
        }
        this.actionSendAttachmentMessage(msg)
      } else if (message.type.endsWith('_POST')) {
        const category = appId ? 'PLAIN_POST' : 'SIGNAL_POST'
        const msg = {
          msg: {
            conversationId,
            content: message.content,
            category,
            status
          }
        }
        this.actionSendMessage(msg)
      } else if (message.type.endsWith('_TEXT')) {
        const category = appId ? 'PLAIN_TEXT' : 'SIGNAL_TEXT'
        const msg = {
          msg: {
            conversationId,
            content: message.content,
            category,
            status
          }
        }
        this.actionSendMessage(msg)
      }
    }, 100)
  }

  onSearch(keyword: string) {
    this.keyword = keyword
    const chats = conversationDao.fuzzySearchConversation(keyword)
    chats.forEach((item: any, index: number) => {
      const participants = participantDao.getParticipantsByConversationId(item.conversationId)
      chats[index].participants = participants
    })
    this.chats = [...chats]
    const contacts = userDao.fuzzySearchUser(this.me.user_id, keyword).filter((item: any) => {
      if (!chats) return []
      return !chats.some((conversation: any) => {
        return conversation.category === ConversationCategory.CONTACT && conversation.ownerId === item.user_id
      })
    })
    this.contacts = [...contacts]
  }

  onChatClick(conversation: any) {
    this.$emit('close')
    this.$store.dispatch('setCurrentConversation', conversation)
    conversation.unseenMessageCount = 0
    setTimeout(() => {
      this.$store.dispatch('markRead', conversation.conversationId)
    }, 100)
    this.sendMessage()
  }
  onUserClick(user: any) {
    this.$emit('close')
    this.$store.dispatch('createUserConversation', {
      user
    })
    this.sendMessage()
  }

  mounted() {
    const callback = (entries: any) => {
      entries.forEach((entry: any) => {
        if (entry.boundingClientRect.top < this.beforeContactTitleTop && !entry.isIntersecting) {
          this.showContactTitleFixed = true
        } else {
          this.showContactTitleFixed = false
        }
        this.beforeContactTitleTop = entry.boundingClientRect.top
      })
    }
    this.observer = new IntersectionObserver(callback)
    this.observer.observe(document.getElementById('contactTitle'))
  }
  destroy() {
    this.observer = null
  }

  isFileType(type: string) {
    return (type.endsWith('_IMAGE') ||
        type.endsWith('_DATA') ||
        type.endsWith('_AUDIO') ||
        type.endsWith('_VIDEO') ||
        type.endsWith('_IMAGE') ||
        type.endsWith('_LIVE'))
  }

  get chatList() {
    if (this.chats.length || this.keyword) return this.chats
    return this.conversations
  }

  get contactList() {
    if (this.contacts.length || this.keyword) return this.contacts
    return this.friends
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
  background: #ffffff55;
}
.message-forward {
  position: relative;
  z-index: 1000;
  width: 28rem;
  padding: 1rem 0;
  max-height: 72vh;
  overflow: hidden;
  list-style: none;
  font-size: 0.875rem;
  background-color: #fff;
  border-radius: 0.25rem;
  border: 1px solid #eee;
  box-shadow: 0 0.3rem 0.8rem rgba(0, 0, 0, 0.195);
  .forward-search {
    width: calc(100% - 4rem);
    margin-left: 1rem;
    input {
      border-radius: 0.2rem;
    }
  }
  .header,
  .title {
    padding: 1rem 1.6rem;
    font-size: 1rem;
    font-weight: 500;
    .svg-icon {
      font-size: 1.45rem;
      cursor: pointer;
    }
  }
  .list {
    font-size: 1rem;
    height: calc(72vh - 8rem);
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
