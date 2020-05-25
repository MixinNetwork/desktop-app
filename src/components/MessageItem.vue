<template>
  <li ref="messageItem" :id="message.messageId">
    <div v-if="unread === message.messageId" class="unread-divide">
      <span>{{$t('unread_message')}}</span>
    </div>
    <div v-if="!prev || !equalDay(message, prev)" :class="{transparent: beforeCreateAt && beforeCreateAt === message.createdAt}" class="time-divide inner">
      <span>{{getTimeDivide(message)}}</span>
    </div>

    <div
      v-if="message.type.startsWith('SIGNAL_') && message.status === MessageStatus.FAILED"
      :class="messageOwnership(message, me)"
    >
      <BadgeItem
        @handleMenuClick="handleMenuClick"
        :type="message.type"
        :send="message.userId === me.user_id"
      >
        <div class="bubble text">
          <div v-if="this.showUserName()">
            <span
              class="username"
              :style="{color: getColor(message.userId)}"
              @click="$emit('user-click',message.userId)"
            >{{message.userFullName}}</span>
          </div>
          <span class="text" v-html="$w(decryptFailedText)"></span>
          <span class="time-place"></span>
          <TimeAndStatus :message="message" />
        </div>
      </BadgeItem>
    </div>

    <StickerItem
      v-else-if="messageType() === 'sticker'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @handleMenuClick="handleMenuClick"
      @user-click="$emit('user-click',message.userId)"
    ></StickerItem>

    <TransferItem
      v-else-if="message.type === 'SYSTEM_ACCOUNT_SNAPSHOT'"
      :message="message"
      :me="me"
      :conversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></TransferItem>

    <ContactItem
      v-else-if="messageType() === 'contact'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-share-click="$emit('user-click',message.sharedUserId)"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></ContactItem>

    <FileItem
      v-else-if="messageType() === 'file'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      :searchKeyword="searchKeyword"
      @mediaClick="mediaClick"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></FileItem>

    <AudioItem
      v-else-if="messageType() === 'audio'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @mediaClick="mediaClick"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></AudioItem>

    <VideoItem
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      v-else-if="messageType() === 'video'"
      @mediaClick="mediaClick"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></VideoItem>

    <RecallItem
      v-else-if="message.type==='MESSAGE_RECALL'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></RecallItem>

    <ImageItem
      v-else-if="messageType() === 'image'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
      @mediaClick="mediaClick"
    ></ImageItem>

    <LiveItem
      v-else-if="messageType() === 'live'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
      @liveClick="liveClick"
    ></LiveItem>

    <LocationItem
      v-else-if="messageType() === 'location'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></LocationItem>

    <PostItem
      v-else-if="messageType() === 'post'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></PostItem>

    <AppCardItem
      v-else-if="messageType() === 'app_card'"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      @action-click="actionClick"
      @handleMenuClick="handleMenuClick"
    ></AppCardItem>

    <AppButtonItem
      v-else-if="messageType() === 'app_button_group'"
      :message="message"
      :showName="this.showUserName()"
      @action-click="actionClick"
      @handleMenuClick="handleMenuClick"
    ></AppButtonItem>

    <div v-else-if="message.type === MessageCategories.SYSTEM_CONVERSATION" class="system">
      <div class="bubble">{{getInfo(message, me)}}</div>
    </div>
    <div v-else :class="messageOwnership(message, me)">
      <div v-if="this.showUserName()&&message.quoteContent">
        <span
          class="username reply"
          :style="{color: getColor(message.userId)}"
          @click="$emit('user-click',message.userId)"
        >{{message.userFullName}}</span>
      </div>
      <BadgeItem
        @handleMenuClick="handleMenuClick"
        :type="message.type"
        :send="message.userId === me.user_id"
        :quote="message.quoteContent!==null"
      >
        <div class="bubble" :class="messageType()">
          <div v-if="this.showUserName()&&!message.quoteContent">
            <span
              class="username"
              :style="{color: getColor(message.userId)}"
              @click="$emit('user-click',message.userId)"
            >{{message.userFullName}}</span>
          </div>
          <ReplyMessageItem
            v-if="message.quoteContent"
            :message="JSON.parse(message.quoteContent)"
            :me="me"
            class="reply"
          ></ReplyMessageItem>
          <span v-if="messageType() === 'text'" class="text">
            <span v-html="$w(textMessage(message))"></span>
          </span>
          <span v-else-if="messageType() === 'unknown'" class="unknown">
            <span v-html="$w(unknownMessage)"></span>
          </span>
          <span class="time-place"></span>
          <TimeAndStatus :message="message" />
        </div>
      </BadgeItem>
    </div>
  </li>
</template>

<script lang="ts">
import fs from 'fs'
import {
  ConversationCategory,
  SystemConversationAction,
  MessageCategories,
  MessageStatus,
  canReply,
  canRecall,
  canForward,
  MediaStatus,
  messageType
} from '@/utils/constants'

import ReplyMessageItem from './chat-item/ReplyMessageItem.vue'
import TransferItem from './chat-item/TransferItem.vue'
import ContactItem from './chat-item/ContactItem.vue'
import FileItem from './chat-item/FileItem.vue'
import PostItem from './chat-item/PostItem.vue'
import LocationItem from './chat-item/LocationItem.vue'
import AppCardItem from './chat-item/AppCardItem.vue'
import AppButtonItem from './chat-item/AppButtonItem.vue'
import AudioItem from './chat-item/AudioItem.vue'
import VideoItem from './chat-item/VideoItem.vue'
import ImageItem from './chat-item/ImageItem.vue'
import LiveItem from './chat-item/LiveItem.vue'
import StickerItem from './chat-item/StickerItem.vue'
import RecallItem from './chat-item/RecallItem.vue'
import BadgeItem from './chat-item/BadgeItem.vue'
import TimeAndStatus from './chat-item/TimeAndStatus.vue'

import { getNameColorById } from '@/utils/util'
import { ipcRenderer } from 'electron'
import contentUtil from '@/utils/content_util'
import { AttachmentMessagePayload } from '@/utils/attachment_util'

import { Vue, Prop, Watch, Component } from 'vue-property-decorator'

import { Getter } from 'vuex-class'

@Component({
  components: {
    ReplyMessageItem,
    TransferItem,
    ContactItem,
    FileItem,
    AudioItem,
    VideoItem,
    ImageItem,
    StickerItem,
    RecallItem,
    BadgeItem,
    LiveItem,
    PostItem,
    LocationItem,
    AppCardItem,
    AppButtonItem,
    TimeAndStatus
  }
})
export default class MessageItem extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Object) readonly prev: any
  @Prop(String) readonly unread: any
  @Prop(String) readonly searchKeyword: any
  @Prop(String) readonly beforeCreateAt: any

  @Getter('me') me: any
  @Getter('currentConversation') conversation: any

  ConversationCategory: any = ConversationCategory
  MessageCategories: any = MessageCategories
  MessageStatus: any = MessageStatus
  $moment: any
  $electron: any
  $Dialog: any
  $Menu: any

  mounted() {
    setTimeout(() => {
      const { messageId } = this.message
      const dom: any = this.$refs.messageItem
      if (dom) {
        let height = dom.getBoundingClientRect().height
        // @ts-ignore
        const marginBottom = document.defaultView.getComputedStyle(dom, null)['marginBottom']
        height += parseInt(marginBottom.split('px')[0])
        this.$emit('loaded', { messageId, height })
      }
    })

    if (this.messageType() === 'text') {
      const target: any = this.$refs.messageItem
      if (!target) return
      const mentionList: any = target.getElementsByClassName('mention')
      if (mentionList.length) {
        for (let i = 0; i < mentionList.length; i++) {
          const mention = mentionList[i]
          const id = mention.className.split('-')[1]
          if (id) {
            mention.onclick = () => {
              this.actionClick('mention:' + id)
            }
          }
        }
      }
    }
  }
  mediaClick() {
    if (this.message.mediaStatus === MediaStatus.DONE) {
      return
    }
    if (this.message.userId === this.me.user_id && this.message.mediaUrl) {
      let {
        appId,
        type,
        messageId,
        conversationId,
        mediaUrl,
        mediaName,
        mediaMimeType,
        mediaDuration,
        mediaSize,
        mediaWidth,
        mediaHeight,
        thumbUrl,
        thumbImage,
        name,
        mediaWaveform
      } = this.message
      if (/^file:\/\//.test(mediaUrl)) {
        mediaUrl = mediaUrl.split('file://')[1]
      }
      const typeEnds = type.split('_')[1]
      const category = (appId ? 'PLAIN_' : 'SIGNAL_') + typeEnds
      const payload: AttachmentMessagePayload = {
        mediaUrl,
        mediaName: mediaName || name,
        mediaMimeType,
        mediaDuration,
        mediaWidth,
        mediaHeight,
        mediaSize,
        thumbUrl,
        thumbImage,
        category,
        mediaWaveform
      }
      const msg = {
        messageId,
        type,
        conversationId,
        payload
      }
      this.$store.dispatch('upload', msg)
    } else {
      this.$store.dispatch('download', this.message.messageId)
    }
  }
  actionClick(action: any) {
    this.$emit('action-click', action)
  }
  showUserName() {
    if (
      !this.conversation ||
      (['app_card', 'app_button_group'].indexOf(this.messageType()) > -1 &&
        this.conversation.category === ConversationCategory.CONTACT)
    ) {
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
      (this.prev.type === MessageCategories.SYSTEM_CONVERSATION ||
        this.prev.type === MessageCategories.SYSTEM_ACCOUNT_SNAPSHOT) &&
      this.message.type !== MessageCategories.SYSTEM_CONVERSATION &&
      this.message.type !== MessageCategories.SYSTEM_ACCOUNT_SNAPSHOT
    ) {
      return true
    }
    return (
      this.conversation.category === ConversationCategory.GROUP &&
      this.message.userId !== this.me.user_id &&
      (!this.prev || (!!this.prev && this.prev.userId !== this.message.userId))
    )
  }
  liveClick() {
    let message = this.message
    ipcRenderer.send('play', {
      width: message.mediaWidth,
      height: message.mediaHeight,
      thumb: message.thumbUrl,
      url: message.mediaUrl,
      pin: localStorage.pinTop
    })
  }
  messageOwnership(message: any, me: any) {
    return {
      reply: message.userId === me.user_id && message.quoteContent,
      send: message.userId === me.user_id,
      receive: message.userId !== me.user_id
    }
  }

  messageType() {
    const { type, content } = this.message
    return messageType(type, content)
  }

  get decryptFailedText() {
    return `${this.$t('chat.chat_decrypt_failed', {
      0: this.message.userFullName
    })}<a href="https://mixin.one/pages/1000007" target="_blank">${this.$t('chat.chat_decrypt_failed_info')}</a>`
  }

  get unknownMessage() {
    return this.$t('chat.chat_not_support', {
      0: `<a href="${this.$t('chat.chat_not_support_url')}" target="_blank">${this.$t('chat.chat_not_support_url')}</a>`
    })
  }

  textMessage(message: any) {
    let content = message.content
    content = contentUtil.renderUrl(content)
    content = contentUtil.renderMention(content, message.mentions)
    if (this.searchKeyword) {
      const pieces = content.split(' ')
      pieces.forEach((piece: string, index: number) => {
        if (!/highlight mention/.test(piece)) {
          pieces[index] = contentUtil.highlight(piece, this.searchKeyword, 'in-bubble')
        }
      })
      content = pieces.join(' ')
    }
    return content
  }

  getInfo(message: any, me: any) {
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
  }
  getTimeDivide(message: any) {
    return contentUtil.renderTime(message.createdAt, false)
  }
  equalDay(message: any, prev: any) {
    const td = this.$moment(message.createdAt).format('YYYY-MM-DD')
    const pd = this.$moment(prev.createdAt).format('YYYY-MM-DD')
    return !this.$moment(pd).diff(this.$moment(td))
  }
  getColor(id: any) {
    return getNameColorById(id)
  }
  handleMenuClick() {
    let menu: any = this.$t('menu.chat_operation')
    let messageMenu: any[] = []
    if (canForward(this.message)) {
      messageMenu.push(menu.forward)
    }
    if (canReply(this.message)) {
      messageMenu.push(menu.reply)
    }
    if (this.message.type.endsWith('_VIDEO')) {
      messageMenu.push(menu.store)
    }
    messageMenu.push(menu.delete)
    if (canRecall(this.message, this.me.user_id)) {
      messageMenu.push(menu.recal)
    }
    const dwidth = document.body.clientWidth
    const dheihgt = document.body.clientHeight
    // @ts-ignore
    let x = dwidth - event.clientX < 250 ? event.clientX - 180 : event.clientX - 20
    // @ts-ignore
    let y = dheihgt - event.clientY < 200 ? event.clientY - messageMenu.length * 42 - 24 : event.clientY + 8
    this.$Menu.alert(x, y, messageMenu, (index: number) => {
      const option = messageMenu[index]
      switch (Object.keys(menu).find(key => menu[key] === option)) {
        case 'reply':
          this.handleReply()
          break
        case 'forward':
          this.handleForward()
          break
        case 'store':
          this.handleStore()
          break
        case 'delete':
          this.handleRemove()
          break
        case 'recal':
          this.handleRecall()
          break
        default:
          break
      }
    })
  }
  handleReply() {
    this.$emit('handle-item-click', {
      type: 'Reply',
      message: this.message
    })
  }
  handleForward() {
    this.$emit('handle-item-click', {
      type: 'Forward',
      message: this.message
    })
  }
  handleStore() {
    let sourcePath = this.message.mediaUrl
    let defaultPath = this.message.mediaUrl.split('/Video')[1]
    const suffix = '.' + this.message.mediaMimeType.split('/')[1]
    if (defaultPath.startsWith('s/')) {
      defaultPath = defaultPath.split('/')[2] + suffix
    }
    if (!/\./.test(defaultPath)) {
      defaultPath += suffix
    }
    const savePath = this.$electron.remote.dialog.showSaveDialogSync(this.$electron.remote.getCurrentWindow(), {
      defaultPath
    })
    if (!savePath) {
      return
    }
    if (sourcePath.startsWith('file://')) {
      sourcePath = sourcePath.replace('file://', '')
    }
    fs.copyFileSync(sourcePath, savePath)
  }
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
  }
  handleRecall() {
    this.$emit('handle-item-click', {
      type: 'Recall',
      message: this.message,
      owner: this.message
    })
  }
}
</script>

<style lang="scss" scoped>
img {
  max-width: 100%;
}
li {
  margin-bottom: 0.45rem;
  pointer-events: none;
  * {
    pointer-events: all;
  }
  &.notice {
    .send,
    .receive {
      transition: transform 0.2s;
      transform-origin: 65% 50%;
    }
    .receive {
      transform-origin: 35% 50%;
    }
    .send,
    .receive {
      transform: scale(1.015);
    }
    .bubble {
      transform: scale(1.02);
    }
    // .bubble {
    //   transition: all 0.3s;
    //   background: #fafafa !important;
    // }
    // .bubble.text::after {
    //   transition: all 0.3s;
    //   border-right-color: #fafafa !important;
    //   border-left-color: #fafafa !important;
    // }
  }
}
.unread-divide {
  background: white;
  color: #8799a5;
  font-size: 0.6rem;
  line-height: 1.5;
  text-align: center;
  padding: 0.1rem;
  margin-bottom: 0.45rem;
  margin-left: -2.4rem;
  margin-right: -2.4rem;
}
.username {
  display: inline-block;
  font-size: 0.65rem;
  line-height: 1.5;
  max-width: 100%;
  min-width: 1.6rem;
  min-height: 0.65rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  &.reply {
    margin-left: 0.6rem;
    margin-bottom: 0;
  }
}
.system {
  text-align: center;
  .bubble {
    border-radius: 0.2rem;
    padding: 0.3rem 0.45rem;
    text-align: left;
    word-wrap: break-word;
    white-space: pre-wrap;
    font-size: 0.6rem;
    background: #def6ca;
  }
}
.message.reply {
  margin: -0.3rem -0.45rem 0.15rem -0.45rem;
}
.bubble {
  position: relative;
  display: inline-block;
  font-size: 0;
  max-width: 80%;
  box-shadow: 0 0.05rem 0.05rem #aaaaaa33;

  &.text,
  &.app_card,
  &.app_button,
  &.unknown,
  &.transfer {
    border-radius: 0.2rem;
    text-align: left;
    word-wrap: break-word;
    white-space: pre-wrap;
    user-select: text;
    font-size: 0.8rem;
    padding: 0.3rem 0.45rem;
    white-space: pre-line;
  }

  .time-place {
    float: right;
    margin-left: 0.45rem;
    width: 3.6rem;
    height: 0.8rem;
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
      margin-left: 0.6rem;
      .time-place {
        width: 2.4rem;
      }
      &:after {
        content: '';
        border-top: 0.3rem solid transparent;
        border-right: 0.45rem solid white;
        border-bottom: 0.3rem solid transparent;
        width: 0;
        height: 0;
        position: absolute;
        left: -0.3rem;
        bottom: 0.2rem;
      }
    }
    &.app_card,
    &.app_button,
    &.transfer {
      background: #fbdda7;
      &:after {
        border-right: 0.45rem solid #fbdda7;
      }
    }
    &.unknown {
      background: #cbe9ca;
      &:after {
        border-right: 0.45rem solid #cbe9ca;
      }
    }
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
      margin-right: 0.6rem;
      background: #c5edff;

      &:after {
        content: '';
        border-top: 0.3rem solid transparent;
        border-left: 0.45rem solid #c5edff;
        border-bottom: 0.3rem solid transparent;
        width: 0;
        height: 0;
        position: absolute;
        right: -0.3rem;
        bottom: 0.2rem;
      }
    }
    &.app_card,
    &.app_button,
    &.transfer {
      background: #fbdda7;
      &:after {
        border-left: 0.45rem solid #fbdda7;
      }
    }
    &.unknown {
      background: #cbe9ca;
      &:after {
        border-left: 0.45rem solid #cbe9ca;
      }
    }
  }
}
.send.reply {
  .bubble {
    &.text {
      background: white;
    }
    &:after {
      border-left: 0.45rem solid white;
    }
  }
}
.time-divide.transparent {
  opacity: 0;
}
</style>
