<template>
  <span class="layout" :class="messageOwnership()">
    <span class="root">
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <img :src="message.assetUrl" loading="lazy" />
      </BadgeItem>
      <span class="time">
        {{message.lt}}
        <ICSending
          v-if="message.userId === me.user_id && (message.status === MessageStatus.SENDING)"
          class="icon"
        />
        <ICSend
          v-else-if="message.userId === me.user_id && message.status === MessageStatus.SENT"
          class="icon"
        />
        <ICRead
          v-else-if="message.userId === me.user_id && message.status === MessageStatus.DELIVERED"
          class="icon wait"
        />
        <ICRead
          v-else-if="message.userId === me.user_id && message.status === MessageStatus.READ"
          class="icon"
        />
      </span>
    </span>
  </span>
</template>
<script>
import { MessageStatus } from '@/utils/constants.js'
import ICSending from '@/assets/images/ic_status_clock.svg'
import ICSend from '@/assets/images/ic_status_send.svg'
import ICRead from '@/assets/images/ic_status_read.svg'
import { getNameColorById } from '@/utils/util.js'
import BadgeItem from './BadgeItem'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
  data: function() {
    return {
      MessageStatus: MessageStatus
    }
  },
  components: {
    ICSending,
    ICSend,
    ICRead,
    BadgeItem
  },
  methods: {
    messageOwnership: function() {
      let { message, me } = this
      return {
        send: message.userId === me.user_id,
        receive: message.userId !== me.user_id
      }
    },
    getColor: function(id) {
      return getNameColorById(id)
    }
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  .root {
    max-width: 18rem;
    display: flex;
    flex-direction: column;
    .username {
      display: inline-block;
      font-size: 0.85rem;
      max-width: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      margin-bottom: 0.2rem;
      margin-left: 0.8rem;
      min-width: 2rem;
      min-height: 0.85rem;
    }
    img {
      max-height: 6rem;
      border-radius: 0.3rem;
    }
    .time {
      color: #8799a5;
      align-self: flex-end;
      display: flex;
      float: right;
      font-size: 0.75rem;
      bottom: 0.3rem;
      right: 0.2rem;
      align-items: flex-end;
      .icon {
        padding-left: 0.2rem;
      }
      .wait {
        path {
          fill: #859479;
        }
      }
    }
  }
}
.layout.send {
  flex-direction: row-reverse;
}
.layout.receive {
  flex-direction: row;
}
</style>
