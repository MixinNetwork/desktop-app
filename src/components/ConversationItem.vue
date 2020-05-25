<template>
  <li
    class="conversation item"
    :id="conversation.conversationId"
    @click="$emit('item-click',conversation)"
    @mouseenter="enter"
    @mouseleave="leave"
    @contextmenu.prevent
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
            v-if="conversation.contentType === 'SYSTEM_ACCOUNT_SNAPSHOT'"
            icon-class="ic_transfer"
            class="icon"
          />
          <svg-icon
            icon-class="ic_status_clock"
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.SENDING"
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
        <svg-icon icon-class="ic_pin_top" v-if="showPinTime" class="icon" />
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
import { MessageStatus, SystemConversationAction, ConversationCategory, messageType } from '@/utils/constants'
import Avatar from '@/components/Avatar.vue'
import { getAccount } from '@/utils/util'

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

  get showPinTime() {
    const { circlePinTime, pinTime } = this.conversation
    return circlePinTime || (circlePinTime === undefined && pinTime)
  }
  get timeAgo() {
    return contentUtil.renderTime(this.conversation.createdAt, true)
  }
  get description() {
    let {
      contentType,
      messageStatus,
      actionName,
      senderId,
      name,
      groupName,
      senderFullName,
      participantUserId,
      participantFullName,
      content,
      mentions
    } = this.conversation
    const account: any = getAccount()
    const id = account.user_id
    let curMessageType = messageType(contentType)
    if (curMessageType === 'app_card' || curMessageType === 'app_button_group') {
      try {
        JSON.parse(content)
      } catch (error) {
        curMessageType = ''
      }
    }
    if (contentType.startsWith('SIGNAL_') && messageStatus === MessageStatus.FAILED) {
      return this.$t('chat.chat_decrypt_failed', {
        0: senderFullName
      })
    }
    if (contentType === 'SYSTEM_CONVERSATION') {
      if (SystemConversationAction.CREATE === actionName) {
        return this.$t('chat.chat_group_create', {
          0: id === senderId ? this.$t('chat.chat_you_start') : name,
          1: groupName
        })
      } else if (SystemConversationAction.ADD === actionName) {
        return this.$t('chat.chat_group_add', {
          0: id === senderId ? this.$t('chat.chat_you_start') : senderFullName,
          1: id === participantUserId ? this.$t('chat.chat_you') : participantFullName
        })
      } else if (SystemConversationAction.REMOVE === actionName) {
        return this.$t('chat.chat_group_remove', {
          0: id === senderId ? this.$t('chat.chat_you_start') : senderFullName,
          1: id === participantUserId ? this.$t('chat.chat_you') : participantFullName
        })
      } else if (SystemConversationAction.JOIN === actionName) {
        return this.$t('chat.chat_group_join', {
          0: id === participantUserId ? this.$t('chat.chat_you_start') : participantFullName
        })
      } else if (SystemConversationAction.EXIT === actionName) {
        return this.$t('chat.chat_group_exit', {
          0: id === participantUserId ? this.$t('chat.chat_you_start') : participantFullName
        })
      } else if (SystemConversationAction.ROLE === actionName) {
        return this.$t('chat.chat_group_role')
      } else {
        return ''
      }
    } else if (curMessageType === 'image') {
      return this.getMessageName() + this.$t('chat.chat_pic')
    } else if (curMessageType === 'sticker') {
      return this.getMessageName() + this.$t('chat.chat_sticker')
    } else if (curMessageType === 'text') {
      content = contentUtil.renderMention(content, mentions)
      content = contentUtil.renderUrl(content)
      return this.getMessageName() + content
    } else if (curMessageType === 'contact') {
      return this.getMessageName() + this.$t('chat.chat_contact')
    } else if (curMessageType === 'file') {
      return this.getMessageName() + this.$t('chat.chat_file')
    } else if (curMessageType === 'audio') {
      return this.getMessageName() + this.$t('chat.chat_audio')
    } else if (curMessageType === 'video') {
      return this.getMessageName() + this.$t('chat.chat_video')
    } else if (curMessageType === 'live') {
      return this.getMessageName() + this.$t('chat.chat_live')
    } else if (curMessageType === 'location') {
      return this.getMessageName() + this.$t('chat.chat_location')
    } else if (curMessageType === 'post') {
      return this.getMessageName() + this.$t('chat.chat_post')
    } else if (curMessageType === 'app_card') {
      return `[${JSON.parse(content).title}]`
    } else if (curMessageType === 'app_button_group') {
      let str = ''
      JSON.parse(content).forEach((item: any) => {
        str += `[${item.label}]`
      })
      return str
    } else if (contentType === 'SYSTEM_ACCOUNT_SNAPSHOT') {
      return this.$t('chat.chat_transfer')
    } else if (contentType === 'MESSAGE_RECALL') {
      if (id === senderId) {
        return this.getMessageName() + this.$t('chat.chat_recall_me')
      } else {
        return this.getMessageName() + this.$t('chat.chat_recall_delete')
      }
    } else {
      return this.$t('chat.chat_not_support', {
        0: ''
      })
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
    const account: any = getAccount()
    return account
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
    background: $hover-bg-color;
  }
  &.active,
  &.active:hover {
    background: #f0f0f0;
  }
  &:hover {
    background: $hover-bg-color;
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
        background: $primary-color;
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
