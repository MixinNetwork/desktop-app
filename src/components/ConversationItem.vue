<template>
  <li
    class="conversation item"
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
          <svg-icon style="width: 0.875rem" icon-class="ic_robot" v-if="conversation.appId" />
        </div>
        <div class="time">{{timeAgo}}</div>
      </div>
      <div class="message">
        <div
          class="layout"
          v-if="conversation.contentType !== 'SYSTEM_CONVERSATION' && conversation.contentType !== 'MESSAGE_RECALL'"
        >
          <svg-icon icon-class="ic_status_clock"
            v-if="isSelf && conversation.messageStatus === MessageStatus.SENDING"
            class="icon"
          />
          <svg-icon icon-class="ic_status_send"
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.SENT"
            class="icon"
          />
          <svg-icon icon-class="ic_status_read"
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.DELIVERED"
            class="icon wait"
          />
          <svg-icon icon-class="ic_status_read"
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.READ"
            class="icon"
          />
        </div>
        <div class="content">{{description}}</div>
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

<script>
import contentUtil from '@/utils/content_util'
import { MessageStatus, SystemConversationAction, ConversationCategory } from '@/utils/constants'
import Avatar from '@/components/Avatar.vue'

export default {
  name: 'ConversationItem',
  props: ['conversation', 'mouseEve'],
  components: {
    Avatar
  },
  computed: {
    timeAgo: function() {
      return contentUtil.renderTime(this.conversation.createdAt, true)
    },
    description: function() {
      const { conversation } = this
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
        return this.getMessageName() + this.conversation.content
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
          return this.getMessageName() + this.$t('chat.chat_app_card')
        } else {
          return this.getMessageName() + this.$t('chat.chat_app_button')
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
    },
    isSelf: function() {
      return this.conversation.senderId === this.getAccount().user_id
    }
  },
  data: function() {
    return {
      show: false,
      fouse: false,
      MessageStatus: MessageStatus
    }
  },
  methods: {
    getAccount: function() {
      return JSON.parse(localStorage.getItem('account'))
    },
    enter: function() {
      this.show = true
    },
    leave: function() {
      this.show = false
    },
    onFocus: function() {
      this.fouse = true
    },
    onBlur: function() {
      this.fouse = false
    },
    isMute: function() {
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
    },
    getMessageName: function() {
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
}
</script>

<style lang="scss" scoped>
$light-font-color: #aaa;
li.conversation.item {
  cursor: pointer;
  display: flex;
  align-items: stretch;
  padding: 0.8rem 0.8rem;
  &:hover,
  &.current {
    background: #f7f7f7;
  }
  &.active {
    background: #f1f2f2;
  }
  #avatar {
    width: 48px;
    height: 48px;
    margin-right: 0.8rem;
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
        line-height: 1.4rem;
        span {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        svg {
          flex-shrink: 0;
          vertical-align: top;
          margin: 0.2rem 0.6rem 0 0.2rem;
        }
      }
      .time {
        color: $light-font-color;
        font-size: 0.75rem;
        flex-shrink: 0;
        margin: 0 0 0.2rem;
      }
    }

    .message {
      display: flex;
      flex-flow: row nowrap;
      min-height: 18px;
      align-items: center;
      .layout {
        display: flex;
        align-items: center;
        .icon {
          width: .875rem;
          height: .875rem;
          margin-right: 3px;
        }
      }
      .mute_icon {
        margin-right: 3px;
      }
      .content {
        flex: 1;
        color: $light-font-color;
        font-size: 0.8rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .down {
        color: #a7a7a7;
        width: 16px;
        height: 16px;
        margin-left: 3px;
      }
      .badge {
        background: #4b7ed2;
        border-radius: 0.8rem;
        box-sizing: border-box;
        color: white;
        font-size: 0.65rem;
        padding: 0.23rem 0.45rem;
        margin-right: 3px;
      }
      .wait {
        path {
          fill: #859479;
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
