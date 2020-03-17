<template>
  <li
    class="conversation item"
    :id="conversation.conversationId"
    @click="$emit('item-click',conversation)"
    @mouseenter="enter"
    @mouseleave="leave"
    @contextmenu.prevent="$emit('item-more',conversation)"
  >
    <Avatar id="avatar" :conversation="conversation" />
    <slot name="check"></slot>
    <div class="info">
      <div class="title">
        <div class="username">
          <span>{{conversation.groupName?conversation.groupName:conversation.name}}</span>
          <svg-icon style="width: 0.7rem" icon-class="ic_robot" v-if="conversation.appId" />
        </div>
        <div class="time">{{timeAgo}}</div>
      </div>
      <div class="message">
        <div
          class="layout"
          v-if="conversation.contentType !== 'SYSTEM_CONVERSATION' && conversation.contentType !== 'MESSAGE_RECALL'"
        >
          <svg-icon
            icon-class="ic_status_clock"
            v-if="isSelf && conversation.messageStatus === MessageStatus.SENDING"
            class="icon"
          />
          <svg-icon
            icon-class="ic_status_send"
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.SENT"
            class="icon"
          />
          <svg-icon
            icon-class="ic_status_delivered"
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.DELIVERED"
            class="icon"
          />
          <svg-icon
            icon-class="ic_status_read"
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.READ"
            class="icon"
          />
        </div>
        <div class="content" v-html="$w(description)" @click.prevent></div>
        <span class="badge mention" v-if="showMention">@</span>
        <span
          class="badge"
          v-if="conversation.unseenMessageCount && conversation.unseenMessageCount!=0"
        >{{conversation.unseenMessageCount}}</span>
        <svg-icon icon-class="ic_mute" v-if="this.isMute()" class="mute_icon" />
        <svg-icon icon-class="ic_pin_top" v-if="conversation.pinTime" class="icon" />
        <transition name="slide-right">
          <a
            @click.stop="$emit('item-menu-click',conversation)"
            @focus="onFocus"
            @blur="onBlur"
            href="javascript:void(0)"
            v-show="show || fouse"
            class="down"
          >
            <font-awesome-icon icon="chevron-down" />
          </a>
        </transition>
      </div>
    </div>
  </li>
</template>

<script lang="ts">
import contentUtil from '@/utils/content_util'
import { MessageStatus, SystemConversationAction, ConversationCategory } from '@/utils/constants'
import Avatar from '@/components/Avatar.vue'

import { Vue, Prop, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component({
  components: {
    Avatar
  }
})
export default class ConversationItem extends Vue {
  @Prop(Object) readonly conversation: any

  @Getter('conversationUnseenMentionsMap') conversationUnseenMentionsMap: any

  show: boolean = false
  fouse: boolean = false
  MessageStatus: any = MessageStatus
  $moment: any

  get timeAgo() {
    return contentUtil.renderTime(this.conversation.createdAt, true)
  }
  get description() {
    const { conversation } = this
    // @ts-ignore
    const id = JSON.parse(localStorage.getItem('account')).user_id
    if (conversation.contentType === 'SYSTEM_CONVERSATION') {
      if (SystemConversationAction.CREATE === conversation.actionName) {
        return this.$t('chat.chat_group_create', {
          0: id === conversation.senderId ? this.$t('chat.chat_you_start') : conversation.name,
          1: conversation.groupName
        })
      } else if (SystemConversationAction.ADD === conversation.actionName) {
        return this.$t('chat.chat_group_add', {
          0: id === conversation.senderId ? this.$t('chat.chat_you_start') : conversation.senderFullName,
          1: id === conversation.participantUserId ? this.$t('chat.chat_you') : conversation.participantFullName
        })
      } else if (SystemConversationAction.REMOVE === conversation.actionName) {
        return this.$t('chat.chat_group_remove', {
          0: id === conversation.senderId ? this.$t('chat.chat_you_start') : conversation.senderFullName,
          1: id === conversation.participantUserId ? this.$t('chat.chat_you') : conversation.participantFullName
        })
      } else if (SystemConversationAction.JOIN === conversation.actionName) {
        return this.$t('chat.chat_group_join', {
          0: id === conversation.participantUserId ? this.$t('chat.chat_you_start') : conversation.participantFullName
        })
      } else if (SystemConversationAction.EXIT === conversation.actionName) {
        return this.$t('chat.chat_group_exit', {
          0: id === conversation.participantUserId ? this.$t('chat.chat_you_start') : conversation.participantFullName
        })
      } else if (SystemConversationAction.ROLE === conversation.actionName) {
        return this.$t('chat.chat_group_role')
      } else {
        return ''
      }
    } else if (conversation.contentType && conversation.contentType.endsWith('_IMAGE')) {
      return this.getMessageName() + this.$t('chat.chat_pic')
    } else if (conversation.contentType && conversation.contentType.endsWith('_STICKER')) {
      return this.getMessageName() + this.$t('chat.chat_sticker')
    } else if (conversation.contentType && conversation.contentType.endsWith('_TEXT')) {
      let content = this.conversation.content
      content = contentUtil.renderMention(content, this.conversation.mentions)
      content = contentUtil.renderUrl(content)
      return this.getMessageName() + content
    } else if (conversation.contentType && conversation.contentType.endsWith('_CONTACT')) {
      return this.getMessageName() + this.$t('chat.chat_contact')
    } else if (conversation.contentType && conversation.contentType.endsWith('_DATA')) {
      return this.getMessageName() + this.$t('chat.chat_file')
    } else if (conversation.contentType && conversation.contentType.endsWith('_AUDIO')) {
      return this.getMessageName() + this.$t('chat.chat_audio')
    } else if (conversation.contentType && conversation.contentType.endsWith('_VIDEO')) {
      return this.getMessageName() + this.$t('chat.chat_video')
    } else if (conversation.contentType && conversation.contentType.endsWith('_LIVE')) {
      return this.getMessageName() + this.$t('chat.chat_live')
    } else if (conversation.contentType && conversation.contentType.endsWith('_POST')) {
      return this.getMessageName() + this.$t('chat.chat_post')
    } else if (conversation.contentType && conversation.contentType.startsWith('APP_')) {
      if (conversation.contentType === 'APP_CARD') {
        return `[${JSON.parse(this.conversation.content).title}]`
      } else {
        let str = ''
        JSON.parse(this.conversation.content).forEach((item: any) => {
          str += `[${item.label}]`
        })
        return str
      }
    } else if (conversation.contentType && conversation.contentType === 'SYSTEM_ACCOUNT_SNAPSHOT') {
      return this.$t('chat.chat_transfer')
    } else if (conversation.contentType && conversation.contentType === 'MESSAGE_RECALL') {
      if (id === conversation.senderId) {
        return this.getMessageName() + this.$t('chat.chat_recall_me')
      } else {
        return this.getMessageName() + this.$t('chat.chat_recall_delete')
      }
    } else {
      return this.$t('chat.chat_unknown')
    }
  }
  get isSelf() {
    return this.conversation.senderId === this.getAccount().user_id
  }

  get showMention() {
    const mentions = this.conversationUnseenMentionsMap[this.conversation.conversationId]
    if (mentions && mentions.length > 0) {
      return true
    }
    return false
  }

  getAccount() {
    // @ts-ignore
    return JSON.parse(localStorage.getItem('account'))
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
  isMute() {
    if (this.conversation.category === ConversationCategory.CONTACT && this.conversation.ownerMuteUntil) {
      if (this.$moment().isBefore(this.conversation.ownerMuteUntil)) {
        return true
      }
    }
    if (this.conversation.category === ConversationCategory.GROUP && this.conversation.muteUntil) {
      if (this.$moment().isBefore(this.conversation.muteUntil)) {
        return true
      }
    }
    return false
  }
  getMessageName() {
    if (
      this.conversation.category === ConversationCategory.GROUP &&
      this.conversation.senderId !== this.getAccount().user_id
    ) {
      return this.conversation.senderFullName + ': '
    } else {
      return ''
    }
  }
}
</script>

<style lang="scss" scoped>
$light-font-color: #aaa;
li.conversation.item {
  cursor: pointer;
  display: flex;
  contain: layout;
  align-items: stretch;
  padding: 0.6rem 0.6rem;
  &.current {
    background: #f7f7f7;
  }
  &.active,
  &.active:hover {
    background: #f1f2f2;
  }
  &:hover {
    background: #f7f7f7;
  }
  #avatar {
    width: 2.4rem;
    height: 2.4rem;
    margin-right: 0.6rem;
  }
  .info {
    flex: 1;
    overflow: hidden;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    .title {
      display: flex;
      flex-direction: row;
      .username {
        overflow: hidden;
        display: flex;
        justify-content: flex-start;
        flex: 1;
        line-height: 1.1rem;
        span {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        svg {
          flex-shrink: 0;
          vertical-align: top;
          margin: 0.15rem 0.45rem 0 0.15rem;
        }
      }
      .time {
        user-select: none;
        color: $light-font-color;
        font-size: 0.6rem;
        flex-shrink: 0;
        margin: 0 0 0.15rem;
      }
    }

    .message {
      display: flex;
      flex-flow: row nowrap;
      min-height: 0.95rem;
      align-items: center;
      .layout {
        display: flex;
        align-items: center;
        .icon {
          width: 0.7rem;
          height: 0.7rem;
          margin-right: 0.15rem;
        }
      }
      .mute_icon,
      .icon {
        font-size: 0.9rem;
        margin-right: 0.15rem;
      }
      .content {
        flex: 1;
        color: $light-font-color;
        font-size: 0.65rem;
        line-height: 0.95rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        /deep/ * {
          color: #aaa;
        }
      }
      .down {
        color: #a7a7a7;
        width: 0.8rem;
        height: 0.8rem;
        margin-left: 0.15rem;
      }
      .badge {
        background: #4b7ed2;
        border-radius: 0.6rem;
        box-sizing: border-box;
        color: white;
        font-size: 0.5rem;
        padding: 0.15rem 0.35rem;
        margin-right: 0.15rem;
        &.mention {
          padding: 0.1rem 0.25rem;
          font-size: 0.6rem;
        }
      }
    }
  }
}
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.15ss;
}
.slide-right-enter,
.slide-right-leave-to {
  transform: translateX(6px);
}
</style>
