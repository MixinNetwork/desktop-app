<template>
  <li>
    <div v-if="unread === message.messageId" class="unread-divide">
      <span>{{$t('unread_message')}}</span>
    </div>
    <div v-if="!prev || !equalDay(message, prev)" class="time-divide">
      <span>{{getTimeDivide(message)}}</span>
    </div>
    <ContactItem
      v-if="message.type.endsWith('_CONTACT')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      @user-share-click="$emit('user-click',message.sharedUserId)"
      @user-click="$emit('user-click',message.userId)"
      :coversation="conversation"
    ></ContactItem>
    <FileItem
      v-else-if="message.type.endsWith('_DATA')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @mediaClick="mediaClick"
      @user-click="$emit('user-click',message.userId)"
    ></FileItem>
    <AudioItem
      v-else-if="message.type.endsWith('_AUDIO')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @user-click="$emit('user-click',message.userId)"
    ></AudioItem>
    <VideoItem
      v-else-if="message.type.endsWith('_VIDEO')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
      @user-click="$emit('user-click',message.userId)"
    ></VideoItem>
    <StickerItem
      v-else-if="message.type.endsWith('_STICKER')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :coversation="conversation"
    ></StickerItem>
    <div v-else-if="message.type === MessageCategories.SYSTEM_CONVERSATION" class="system">
      <div class="bubble">{{getInfo(message, me)}}</div>
    </div>
    <div v-else v-bind:class="messageOwnership(message, me)">
      <div class="bubble" v-bind:class="messageType(message)">
        <div v-if="this.showUserName()">
          <span
            class="username"
            v-bind:style="{color: getColor(message.userId)}"
            @click="$emit('user-click',message.userId)"
          >{{message.userFullName}}</span>
        </div>
        <ReplyMessageItem
          v-if="message.quoteContent"
          :message="JSON.parse(message.quoteContent)"
          class="reply"
        ></ReplyMessageItem>
        <span v-if="messageType(message) === 'text'" class="text">
          <span v-html="textMessage(message)"></span>
        </span>
        <div v-else-if="messageType(message) === 'sticker'">
          <img v-bind:src="message.assetUrl">
        </div>
        <img
          v-else-if="messageType(message) === 'image'"
          v-bind:src="media(message)"
          v-bind:loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
          v-bind:class="borderSet(message)"
          v-bind:style="borderSetObject(message)"
          @click="preview"
        >
        <span
          v-else-if="messageType(message) === 'app_card'"
          class="app_card"
        >{{$t('chat.chat_app_card') }}</span>
        <span
          v-else-if="messageType(message) === 'app_button'"
          class="app_button"
        >{{$t('chat.chat_app_button') }}</span>
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
          <ICSend v-else-if="message.status === MessageStatus.SENT" class="icon"/>
          <ICRead v-else-if="message.status === MessageStatus.DELIVERED" class="icon wait"/>
          <ICRead v-else-if="message.status === MessageStatus.READ" class="icon"/>
        </span>
        <spinner class="loading" v-if="messageType(message) === 'image' && loading"></spinner>
        <AttachmentIcon class="loading" @mediaClick="mediaClick" :me="me" :message="message" v-else></AttachmentIcon>
      </div>
    </div>
  </li>
</template>

<script>
import {
  ConversationCategory,
  MessageStatus,
  SystemConversationAction,
  MessageCategories,
  MediaStatus
} from '@/utils/constants.js'
import spinner from '@/components/Spinner.vue'
import AttachmentIcon from '@/components/AttachmentIcon.vue'
import ICSending from '../assets/images/ic_status_clock.svg'
import ICSend from '../assets/images/ic_status_send.svg'
import ICRead from '../assets/images/ic_status_read.svg'

import ReplyMessageItem from './chat-item/ReplyMessageItem'
import ContactItem from './chat-item/ContactItem'
import FileItem from './chat-item/FileItem'
import AudioItem from './chat-item/AudioItem'
import VideoItem from './chat-item/VideoItem'
import StickerItem from './chat-item/StickerItem'

import messageDao from '@/dao/message_dao.js'

import { mapGetters } from 'vuex'
import { getColorById } from '@/utils/util.js'
import URI from 'urijs'
export default {
  name: 'MessageItem',
  props: ['conversation', 'message', 'me', 'prev', 'unread'],
  components: {
    spinner,
    ICSending,
    ICSend,
    ICRead,
    AttachmentIcon,
    ReplyMessageItem,
    ContactItem,
    FileItem,
    AudioItem,
    VideoItem,
    StickerItem
  },
  data: function() {
    return {
      ConversationCategory: ConversationCategory,
      MessageStatus: MessageStatus,
      MessageCategories: MessageCategories
    }
  },
  computed: {
    loading: function() {
      return this.attachment.includes(this.message.messageId)
    },
    ...mapGetters({
      attachment: 'attachment'
    })
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
        let local = messageDao.findImages(this.conversation.conversationId)
        let images = local.map((item, index) => {
          if (item.message_id === this.message.messageId) {
            position = index
          }
          return { url: item.media_url }
        })
        this.$imageViewer.images(images)
        this.$imageViewer.index(position)
        this.$imageViewer.show()
      }
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
      URI.findUri.end = /[\s\r\n]|[\uFF00-\uFFEF]|$/
      var result = URI.withinString(message.content, function(url) {
        let l = url
        if (!url.startsWith('http')) {
          l = 'https://' + url
        }
        return `<a href='${l}' target='_blank'>${url}</a>`
      })
      return result
    },
    borderSet: message => {
      if (1.5 * message.mediaWidth > message.mediaHeight) {
        return 'width-set'
      }
      if (3 * message.mediaWidth < message.mediaHeight) {
        return 'width-set'
      }
      return 'height-set'
    },
    media: message => {
      if (message.mediaUrl === null || message.mediaUrl === undefined || message.mediaUrl === '') {
        return 'data:' + message.mediaMimeType + ';base64,' + message.thumbImage
      }
      return message.mediaUrl
    },
    borderSetObject: message => {
      if (1.5 * message.mediaWidth > message.mediaHeight) {
        return { width: message.mediaWidth + 'px' }
      }
      if (3 * message.mediaWidth < message.mediaHeight) {
        return { width: message.mediaWidth + 'px' }
      }
      return { height: message.mediaHeight + 'px' }
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
      return getColorById(id)
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
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-bottom: 0.2rem;
  cursor: pointer;
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
  &.transfer {
    border-radius: 0.2rem;
    text-align: left;
    word-break: break-all;
    user-select: text;
    font-size: 1rem;
    padding: 0.4rem 0.6rem;
  }
  &.sticker,
  &.image {
    .time-place {
      display: none;
    }
  }
  &.sticker {
    margin-left: 0.8rem;
    margin-right: 0.8rem;
    position: inherit;
    display: inline-block;
    max-width: 6rem;
    img {
      max-height: 6rem;
    }
    .time {
      position: inherit;
    }
  }
  &.image {
    max-width: 10rem;
    max-height: 15rem;
    margin-left: 0.8rem;
    margin-right: 0.8rem;
    border-radius: 0.2rem;
    overflow: hidden;
    position: relative;
    .time {
      width: 100%;
      box-sizing: border-box;
      display: block;
      text-align: right;
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(0, 0, 0, 0.6) 100%);
      bottom: 0;
      right: 0;
      color: white;
      padding: 1rem 0.3rem 0.2rem 1rem;
    }
    .loading {
      width: 32px;
      height: 32px;
      left: 50%;
      top: 50%;
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 3;
    }
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
    &.image {
      .icon {
        float: right;
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
