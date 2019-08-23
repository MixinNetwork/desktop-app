<template>
  <li>
    <div v-if="unread === message.messageId" class="unread-divide">
      <span>{{$t('unread_message')}}</span>
    </div>
    <div v-if="!prev || !equalDay(message, prev)" class="time-divide">
      <span>{{getTimeDivide(message)}}</span>
    </div>

    <StickerItem
      v-if="message.type.endsWith('_STICKER')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @handleMenuClick="handleMenuClick"
      @user-click="$emit('user-click',message.userId)"
    ></StickerItem>

    <ContactItem
      v-else-if="message.type.endsWith('_CONTACT')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @user-share-click="$emit('user-click',message.sharedUserId)"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></ContactItem>

    <FileItem
      v-else-if="message.type.endsWith('_DATA')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @mediaClick="mediaClick"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></FileItem>

    <AudioItem
      v-else-if="message.type.endsWith('_AUDIO')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></AudioItem>

    <VideoItem
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      v-else-if="message.type.endsWith('_VIDEO')"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></VideoItem>

    <RecallItem
      v-else-if="message.type==='MESSAGE_RECALL'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></RecallItem>

    <ImageItem
      v-else-if="message.type.endsWith('_IMAGE')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
      @preview="preview"
      @mediaClick="mediaClick"
    ></ImageItem>

    <LiveItem
      v-else-if="message.type.endsWith('_LIVE')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
      @liveClick="liveClick"
    ></LiveItem>

    <div v-else-if="message.type === MessageCategories.SYSTEM_CONVERSATION" class="system">
      <div class="bubble">{{getInfo(message, me)}}</div>
    </div>
    <div v-else v-bind:class="messageOwnership(message, me)">
      <div v-if="this.showUserName()&&message.quoteContent">
        <span
          class="username reply"
          v-bind:style="{color: getColor(message.userId)}"
          @click="$emit('user-click',message.userId)"
        >{{message.userFullName}}</span>
      </div>
      <BadgeItem
        @handleMenuClick="handleMenuClick"
        :type="message.type"
        :send="message.userId === me.user_id"
        :quote="message.quoteContent!==null"
      >
        <div class="bubble" v-bind:class="messageType(message)">
          <div v-if="this.showUserName()&&!message.quoteContent">
            <span
              class="username"
              v-bind:style="{color: getColor(message.userId)}"
              @click="$emit('user-click',message.userId)"
            >{{message.userFullName}}</span>
          </div>
          <ReplyMessageItem
            v-if="message.quoteContent"
            :message="JSON.parse(message.quoteContent)"
            :me="me"
            class="reply"
          ></ReplyMessageItem>
          <span v-if="messageType(message) === 'text'" class="text">
            <span v-html="textMessage(message)"></span>
          </span>
          <span
            v-else-if="messageType(message) === 'app_card'"
            class="app_card"
          >{{$t('chat.chat_app_card') }}</span>
          <span
            v-else-if="messageType(message) === 'app_button'"
            class="app_button"
          >{{$t('chat.chat_app_button') }}</span>
          <span
            v-else-if="messageType(message) === 'unknown'"
            class="unknown"
          >{{$t('chat.chat_unknown') }}</span>
          <span
            v-else-if="messageType(message) === 'transfer'"
            class="transfer"
          >{{transferText(message)}}</span>
          <span class="time-place"></span>
          <span class="time">
            {{message.lt}}
            <ICSending
              v-if="message.status === MessageStatus.SENDING || message.status === MessageStatus.PENDING"
              class="icon"
            />
            <ICSend v-else-if="message.status === MessageStatus.SENT" class="icon" />
            <ICRead v-else-if="message.status === MessageStatus.DELIVERED" class="icon wait" />
            <ICRead v-else-if="message.status === MessageStatus.READ" class="icon" />
          </span>
        </div>
      </BadgeItem>
    </div>
  </li>
</template>

<script>
import {
  ConversationCategory,
  MessageStatus,
  SystemConversationAction,
  MessageCategories,
  canReply,
  canRecall,
  MediaStatus
} from '@/utils/constants.js'

import ICSending from '../assets/images/ic_status_clock.svg'
import ICSend from '../assets/images/ic_status_send.svg'
import ICRead from '../assets/images/ic_status_read.svg'

import ReplyMessageItem from './chat-item/ReplyMessageItem'
import ContactItem from './chat-item/ContactItem'
import FileItem from './chat-item/FileItem'
import AudioItem from './chat-item/AudioItem'
import VideoItem from './chat-item/VideoItem'
import ImageItem from './chat-item/ImageItem'
import LiveItem from './chat-item/LiveItem'
import StickerItem from './chat-item/StickerItem'
import RecallItem from './chat-item/RecallItem'
import BadgeItem from './chat-item/BadgeItem'

import messageDao from '@/dao/message_dao.js'

import { getNameColorById } from '@/utils/util.js'
import { ipcRenderer } from 'electron'
import URI from 'urijs'
export default {
  name: 'MessageItem',
  props: ['conversation', 'message', 'me', 'prev', 'unread'],
  components: {
    ICSending,
    ICSend,
    ICRead,
    ReplyMessageItem,
    ContactItem,
    FileItem,
    AudioItem,
    VideoItem,
    ImageItem,
    StickerItem,
    RecallItem,
    BadgeItem,
    LiveItem
  },
  data: function() {
    return {
      ConversationCategory: ConversationCategory,
      MessageStatus: MessageStatus,
      MessageCategories: MessageCategories,
      fouse: false,
      show: false,
      menus: this.$t('menu.chat_operation')
    }
  },
  methods: {
    mediaClick() {
      if (this.message.mediaStatus !== MediaStatus.CANCELED) {
        return
      }
      if (this.message.mediaUrl) {
        this.$store.dispatch('upload', this.message)
      } else {
        this.$store.dispatch('download', this.message.messageId)
      }
    },
    showUserName() {
      if (!this.conversation) {
        return false
      }
      if (
        this.conversation.category === ConversationCategory.CONTACT &&
        this.message.userId !== this.conversation.ownerId &&
        this.message.userId !== this.me.user_id &&
        (!this.prev || (!!this.prev && this.prev.userId !== this.message.userId))
      ) {
        return true
      }
      if (
        this.prev &&
        this.message.userId !== this.me.user_id &&
        ((this.prev.type === MessageCategories.SYSTEM_CONVERSATION ||
          this.prev.type === MessageCategories.SYSTEM_ACCOUNT_SNAPSHOT) &&
          (this.message.type !== MessageCategories.SYSTEM_CONVERSATION &&
            this.message.type !== MessageCategories.SYSTEM_ACCOUNT_SNAPSHOT))
      ) {
        return true
      }
      return (
        this.conversation.category === ConversationCategory.GROUP &&
        this.message.userId !== this.me.user_id &&
        (!this.prev || (!!this.prev && this.prev.userId !== this.message.userId))
      )
    },
    preview() {
      if (this.message.type.endsWith('_IMAGE') && this.message.mediaUrl) {
        let position = 0
        let local = messageDao.findImages(this.conversation.conversationId, this.message.messageId)
        let images = local.map((item, index) => {
          if (item.message_id === this.message.messageId) {
            position = index
          }
          return { url: item.media_url, width: item.media_width, height: item.media_height }
        })
        this.$imageViewer.images(images)
        this.$imageViewer.index(position)
        this.$imageViewer.show()
      }
    },
    liveClick() {
      let message = this.message
      ipcRenderer.send('play', {
        width: message.mediaWidth,
        height: message.mediaHeight,
        thumb: message.thumbUrl,
        url: message.mediaUrl,
        pin: localStorage.pinTop
      })
    },
    messageOwnership: (message, me) => {
      return {
        reply: message.userId === me.user_id && message.quoteContent,
        send: message.userId === me.user_id,
        receive: message.userId !== me.user_id
      }
    },
    messageType: message => {
      let type = message.type
      if (type.endsWith('_STICKER')) {
        return 'sticker'
      } else if (type.endsWith('_IMAGE')) {
        return 'image'
      } else if (type.endsWith('_TEXT')) {
        return 'text'
      } else if (type.endsWith('_VIDEO')) {
        return 'video'
      } else if (type.endsWith('_AUDIO')) {
        return 'audio'
      } else if (type.endsWith('_DATA')) {
        return 'file'
      } else if (type.endsWith('_CONTACT')) {
        return 'contact'
      } else if (type.startsWith('APP_')) {
        if (type === 'APP_CARD') {
          return 'app_card'
        } else {
          return 'app_button'
        }
      } else if (type === 'SYSTEM_ACCOUNT_SNAPSHOT') {
        return 'transfer'
      } else {
        return 'unknown'
      }
    },
    transferText: function(message) {
      if (message.userId === this.me.user_id) {
        return this.$t('chat.chat_transfer_send')
      } else {
        return this.$t('chat.chat_transfer_receive')
      }
    },
    textMessage: message => {
      var result = URI.withinString(message.content, function(url) {
        let l = url
        if (!url.startsWith('http')) {
          l = 'https://' + url
        }
        return `<a href='${l}' target='_blank'>${url}</a>`
      })
      return result
    },

    getInfo(message, me) {
      const id = me.user_id
      if (SystemConversationAction.CREATE === message.actionName) {
        return this.$t('chat.chat_group_create', {
          0: id === message.userId ? this.$t('chat.chat_you_start') : message.userFullName,
          1: message.groupName
        })
      } else if (SystemConversationAction.ADD === message.actionName) {
        return this.$t('chat.chat_group_add', {
          0: id === message.userId ? this.$t('chat.chat_you_start') : message.userFullName,
          1: id === message.participantUserId ? this.$t('chat.chat_you') : message.participantFullName
        })
      } else if (SystemConversationAction.REMOVE === message.actionName) {
        return this.$t('chat.chat_group_remove', {
          0: id === message.userId ? this.$t('chat.chat_you_start') : message.userFullName,
          1: id === message.participantUserId ? this.$t('chat.chat_you') : message.participantFullName
        })
      } else if (SystemConversationAction.JOIN === message.actionName) {
        return this.$t('chat.chat_group_join', {
          0: id === message.participantUserId ? this.$t('chat.chat_you_start') : message.participantFullName
        })
      } else if (SystemConversationAction.EXIT === message.actionName) {
        return this.$t('chat.chat_group_exit', {
          0: id === message.participantUserId ? this.$t('chat.chat_you_start') : message.participantFullName
        })
      } else if (SystemConversationAction.ROLE === message.actionName) {
        return this.$t('chat.chat_group_role')
      } else {
        return this.$t('chat.chat_no_support')
      }
    },
    getTimeDivide(message) {
      let t = Math.floor(Date.parse(message.createdAt) / 1000 / 3600 / 24)
      let current = Math.floor(new Date().getTime() / 1000 / 3600 / 24)
      let d = new Date(message.createdAt)
      if (t === current) {
        return this.$t('today')
      } else if (current - t === 1) {
        return this.$t('yesterday')
      } else if (current - t < 7) {
        return this.$t('week')[d.getDay()]
      } else {
        return ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2)
      }
    },
    equalDay(message, prev) {
      return (
        Math.floor(Date.parse(message.createdAt) / 1000 / 3600 / 24) ===
        Math.floor(Date.parse(prev.createdAt) / 1000 / 3600 / 24)
      )
    },
    getColor: function(id) {
      return getNameColorById(id)
    },
    enter() {
      this.show = true
    },
    leave() {
      this.show = false
    },
    onFocus() {
      this.fouse = true
    },
    onBlur() {
      this.fouse = false
    },
    handleMenuClick() {
      let menu = this.$t('menu.chat_operation')
      let messageMenu = []
      if (canReply(this.message.type)) {
        messageMenu.push(menu[0])
      }
      messageMenu.push(menu[2])
      if (canRecall(this.message, this.me.user_id)) {
        messageMenu.push(menu[3])
      }
      const dwidth = document.body.clientWidth
      const dheihgt = document.body.clientHeight
      let x = dwidth - event.clientX < 250 ? event.clientX - 180 : event.clientX - 20
      let y = dheihgt - event.clientY < 200 ? event.clientY - messageMenu.length * 42 - 24 : event.clientY + 8
      this.$Menu.alert(x, y, messageMenu, index => {
        const option = messageMenu[index]
        switch (Object.keys(menu).find(key => menu[key] === option)) {
          case '0':
            this.handleReply()
            break
          case '1':
            this.handleForward()
            break
          case '2':
            this.handleRemove()
            break
          case '3':
            this.handleRecall()
            break
          default:
            break
        }
      })
    },
    handleReply() {
      this.$emit('handle-item-click', {
        type: 'Reply',
        message: this.message
      })
    },
    handleForward() {
      this.$emit('handle-item-click', {
        type: 'Forward',
        message: this.message
      })
    },
    handleRemove() {
      let { message } = this
      this.$Dialog.alert(
        this.$t('confirm_remove'),
        this.$t('ok'),
        () => {
          this.$emit('handle-item-click', {
            type: 'Remove',
            message: message
          })
        },
        this.$t('cancel'),
        () => {}
      )
    },
    handleRecall() {
      this.$emit('handle-item-click', {
        type: 'Recall',
        message: this.message,
        owner: this.message
      })
    }
  }
}
</script>

<style lang="scss" scoped>
img {
  max-width: 100%;
}
li {
  margin-bottom: 0.6rem;
}
.unread-divide {
  background: white;
  color: #8799a5;
  font-size: 0.75rem;
  text-align: center;
  padding: 0.2rem;
  margin-bottom: 0.6rem;
  margin-left: -3rem;
  margin-right: -3rem;
}
.time-divide {
  color: #8799a5;
  font-size: 0.75rem;
  text-align: center;
  margin-bottom: 0.6rem;
  span {
    background: #d5d3f3;
    border-radius: 0.2rem;
    display: inline-block;
    padding: 0.2rem 0.6rem;
  }
}
.username {
  display: inline-block;
  font-size: 0.85rem;
  max-width: 100%;
  min-width: 2rem;
  min-height: 0.85rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-bottom: 0.2rem;
  cursor: pointer;
  &.reply {
    margin-left: 0.8rem;
  }
}
.system {
  text-align: center;
  .bubble {
    border-radius: 0.2rem;
    padding: 0.4rem 0.6rem;
    text-align: left;
    word-break: break-all;
    font-size: 0.8rem;
    background: #def6ca;
  }
}
.message.reply {
  margin: -0.4rem -0.6rem 0.2rem -0.6rem;
}
.bubble {
  position: relative;
  display: inline-block;
  font-size: 0;
  max-width: 80%;

  &.text,
  &.app_card,
  &.app_button,
  &.unknown,
  &.transfer {
    border-radius: 0.2rem;
    text-align: left;
    word-break: break-all;
    user-select: text;
    font-size: 1rem;
    padding: 0.4rem 0.6rem;
    white-space: pre-line;
  }

  .width-set {
    max-width: 10rem;
  }
  .height-set {
    max-height: 15rem;
  }
  .time-place {
    float: right;
    margin-left: 0.6rem;
    width: 4.5rem;
    height: 1rem;
  }
  .time {
    color: #8799a5;
    display: flex;
    float: right;
    font-size: 0.75rem;
    position: absolute;
    bottom: 0.3rem;
    right: 0.2rem;
    align-items: flex-end;
  }
  .icon {
    padding-left: 0.2rem;
  }
}
.receive {
  text-align: left;
  .bubble {
    &.text,
    &.app_card,
    &.app_button,
    &.unknown,
    &.transfer {
      background: white;
      margin-left: 0.8rem;
      .time-place {
        width: 3rem;
      }
      &:after {
        content: '';
        border-top: 0.4rem solid transparent;
        border-right: 0.6rem solid white;
        border-bottom: 0.4rem solid transparent;
        width: 0;
        height: 0;
        position: absolute;
        left: -0.4rem;
        bottom: 0.3rem;
      }
    }
    &.app_card,
    &.app_button,
    &.transfer {
      background: #fbdda7;
      &:after {
        border-right: 0.6rem solid #fbdda7;
      }
    }
    &.unknown {
      background: #cbe9ca;
      &:after {
        border-right: 0.6rem solid #cbe9ca;
      }
    }
  }
  .icon {
    display: none;
  }
}
.send {
  text-align: right;
  .bubble {
    &.text,
    &.app_card,
    &.app_button,
    &.unknown,
    &.transfer {
      margin-right: 0.8rem;
      background: #c5edff;

      &:after {
        content: '';
        border-top: 0.4rem solid transparent;
        border-left: 0.6rem solid #c5edff;
        border-bottom: 0.4rem solid transparent;
        width: 0;
        height: 0;
        position: absolute;
        right: -0.4rem;
        bottom: 0.3rem;
      }
    }
    &.app_card,
    &.app_button,
    &.transfer {
      background: #fbdda7;
      &:after {
        border-left: 0.6rem solid #fbdda7;
      }
    }
    &.unknown {
      background: #cbe9ca;
      &:after {
        border-left: 0.6rem solid #cbe9ca;
      }
    }
  }
  .wait {
    path {
      fill: #859479;
    }
  }
}
.send.reply {
  .bubble {
    &.text {
      background: white;
    }
    &:after {
      border-left: 0.6rem solid white;
    }
  }
}
</style>
