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
          {{conversation.groupName?conversation.groupName:conversation.name}}
          <ICRobot v-if="conversation.appId" />
        </div>
        <div class="time">{{timeAgo}}</div>
      </div>
      <div class="message">
        <div
          class="layout"
          v-if="conversation.contentType !== 'SYSTEM_CONVERSATION' && conversation.contentType !== 'MESSAGE_RECALL'"
        >
          <ICSending
            v-if="isSelf && conversation.messageStatus === MessageStatus.SENDING"
            class="icon"
          />
          <ICSend
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.SENT"
            class="icon"
          />
          <ICRead
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.DELIVERED"
            class="icon wait"
          />
          <ICRead
            v-else-if="isSelf && conversation.messageStatus === MessageStatus.READ"
            class="icon"
          />
        </div>
        <div class="content">{{description}}</div>
        <span
          class="badge"
          v-if="conversation.unseenMessageCount && conversation.unseenMessageCount!=0"
        >{{conversation.unseenMessageCount}}</span>
        <ICMute v-if="this.isMute()" class="mute_icon" />
        <ICPin v-if="conversation.pinTime" class="icon" />
        <transition name="slide-right">
          <a
            @click.stop="$emit('item-menu-click',conversation)"
            @focus="onFocus"
            @blur="onBlur"
            href="javascript:void(0)"
            v-show="show || fouse"
          >
            <font-awesome-icon class="down" icon="chevron-down" />
          </a>
        </transition>
      </div>
    </div>
  </li>
</template>

<script>
import { timeAgo } from '@/utils/util.js'
import { MessageStatus, SystemConversationAction, ConversationCategory } from '@/utils/constants.js'
import Avatar from '@/components/Avatar.vue'
import ICSend from '@/assets/images/ic_status_send.svg'
import ICRead from '@/assets/images/ic_status_read.svg'
import ICSending from '@/assets/images/ic_status_clock.svg'
import ICPin from '@/assets/images/ic_pin_top.svg'
import ICRobot from '@/assets/images/ic_robot.svg'
import ICMute from '@/assets/images/ic_mute.svg'

export default {
  name: 'ConversationItem',
  props: ['conversation', 'mouseEve'],
  components: {
    Avatar,
    ICSending,
    ICSend,
    ICRead,
    ICPin,
    ICRobot,
    ICMute
  },
  computed: {
    timeAgo: function() {
      return timeAgo(this.conversation.createdAt)
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
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
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
