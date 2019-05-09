<template>
  <div class="layout" v-bind:class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        v-bind:style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <div class="recall">
        <span>{{$t('chat.chat_recall_delete')}}</span>
        <span class="time">{{message.lt}}</span>
      </div>
    </div>
  </div>
</template>
<script>
import { MessageStatus, MediaStatus } from '@/utils/constants.js'
import { getColorById } from '@/utils/util.js'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
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
  .username {
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.2rem;
  }
  .recall {
    display: flex;
    align-items: flex-end;
    background: #c5edff;
    border-radius: 0.2rem;
    text-align: left;
    font-size: 1rem;
    padding: 0.4rem 0.6rem;

    .time {
      color: #8799a5;
      display: flex;
      font-size: 0.75rem;
      bottom: 0.3rem;
      right: 0.2rem;
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
