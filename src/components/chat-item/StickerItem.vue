<template>
  <div class="layout" v-bind:class="messageOwnership()">
    <div class="root">
      <span
        class="username"
        v-if="showName"
        v-bind:style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <img v-bind:src="message.assetUrl">
      <span class="time">
        {{message.lt}}
        <ICSending
          v-if="message.userId === me.user_id && (message.status === MessageStatus.SENDING || message.status === MessageStatus.PENDING)"
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
    </div>
  </div>
</template>
<script>
import { MessageStatus } from '@/utils/constants.js'
import ICSending from '@/assets/images/ic_status_clock.svg'
import ICSend from '@/assets/images/ic_status_send.svg'
import ICRead from '@/assets/images/ic_status_read.svg'
import { getColorById } from '@/utils/util.js'
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
    ICRead
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
      return getColorById(id)
    }
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  padding-left: 0.8rem;
  padding-right: 0.8rem;

  .root {
    max-width: 6rem;
    .username {
      display: inline-block;
      font-size: 0.85rem;
      max-width: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      margin-bottom: 0.2rem;
    }
    img {
      max-height: 6rem;
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
