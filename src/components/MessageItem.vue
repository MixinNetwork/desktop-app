<template>
  <li ref="messageItem" :id="`m-${message.messageId}`">
    <div v-if="unread === message.messageId" class="unread-divide">
      <span>{{$t('unread_message')}}</span>
    </div>
    <div v-if="!prev || !equalDay(message, prev)" class="time-divide inner">
      <span>{{getTimeDivide(message)}}</span>
    </div>

    <StickerItem
      v-if="message.type.endsWith('_STICKER')"
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
      v-else-if="message.type.endsWith('_CONTACT')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-share-click="$emit('user-click',message.sharedUserId)"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></ContactItem>

    <FileItem
      v-else-if="message.type.endsWith('_DATA')"
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
      v-else-if="message.type.endsWith('_AUDIO')"
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
      v-else-if="message.type.endsWith('_VIDEO')"
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
      v-else-if="message.type.endsWith('_IMAGE')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
      @mediaClick="mediaClick"
    ></ImageItem>

    <LiveItem
      v-else-if="message.type.endsWith('_LIVE')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
      @liveClick="liveClick"
    ></LiveItem>

    <PostItem
      v-else-if="message.type.endsWith('_POST')"
      :message="message"
      :me="me"
      :showName="this.showUserName()"
      :conversation="conversation"
      @user-click="$emit('user-click',message.userId)"
      @handleMenuClick="handleMenuClick"
    ></PostItem>

    <AppCardItem
      v-else-if="message.type.startsWith('APP_CARD')"
      :message="message"
      :showName="this.showUserName()"
      @action-click="actionClick"
      @handleMenuClick="handleMenuClick"
    ></AppCardItem>

    <AppButtonItem
      v-else-if="message.type.startsWith('APP_BUTTON')"
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
        <div class="bubble" :class="messageType(message)">
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
          <span v-if="messageType(message) === 'text'" class="text">
            <span v-html="textMessage(message)"></span>
          </span>
          <span
            v-else-if="messageType(message) === 'unknown'"
            class="unknown"
          >{{$t('chat.chat_unknown') }}</span>
          <span class="time-place"></span>
          <TimeAndStatus :message="message" />
        </div>
      </BadgeItem>
    </div>
  </li>
</template>

<script lang="ts">
import {
  ConversationCategory,
  SystemConversationAction,
  MessageCategories,
  canReply,
  canRecall,
  canForward,
  MediaStatus
} from '@/utils/constants'

import ReplyMessageItem from './chat-item/ReplyMessageItem.vue'
import TransferItem from './chat-item/TransferItem.vue'
import ContactItem from './chat-item/ContactItem.vue'
import FileItem from './chat-item/FileItem.vue'
import PostItem from './chat-item/PostItem.vue'
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

import { Vue, Prop, Watch, Component } from 'vue-property-decorator'

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
    AppCardItem,
    AppButtonItem,
    TimeAndStatus
  }
})
export default class MessageItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Object) readonly prev: any
  @Prop(String) readonly unread: any
  @Prop(String) readonly searchKeyword: any

  ConversationCategory: any = ConversationCategory
  MessageCategories: any = MessageCategories
  fouse: boolean = false
  show: boolean = false
  $moment: any
  $Dialog: any
  $Menu: any

  mounted() {
    const { messageId } = this.message
    const dom: any = this.$refs.messageItem
    const height = dom.getBoundingClientRect().height
    this.$emit('loaded', { messageId, height })
  }
  mediaClick() {
    if (this.message.mediaStatus !== MediaStatus.CANCELED && this.message.mediaStatus !== MediaStatus.EXPIRED) {
      return
    }
    if (this.message.userId === this.me.user_id && this.message.mediaUrl) {
      this.$store.dispatch('upload', this.message)
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
      ((this.message.type.startsWith('APP_CARD') || this.message.type.startsWith('APP_BUTTON')) &&
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
  messageType(message: any) {
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
    } else {
      return 'unknown'
    }
  }
  textMessage(message: any) {
    let content = contentUtil.renderUrl(message.content)
    if (this.searchKeyword) {
      content = contentUtil.highlight(content, this.searchKeyword, 'in-bubble')
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
  enter() {
    this.show = true
  }
  leave() {
    this.show = false
  }
  onFocus() {
    this.fouse = true
  }
  onBlur() {
    this.fouse = false
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
  margin-bottom: 0.6rem;
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
  font-size: 0.75rem;
  text-align: center;
  padding: 0.2rem;
  margin-bottom: 0.6rem;
  margin-left: -3rem;
  margin-right: -3rem;
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
    margin-bottom: 0;
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
  box-shadow: 0px 1px 1px #aaaaaa33;

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
