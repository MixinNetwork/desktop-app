<template>
  <div class="layout" v-bind:class="messageOwnership()">
    <BadgeItem
      @handleMenuClick="$emit('handleMenuClick')"
      :type="message.type"
      :send="message.userId === me.user_id"
    >
      <div class="bubble">
        <span
          class="username"
          v-if="showName"
          v-bind:style="{color: getColor(message.userId)}"
          @click="$emit('user-click')"
        >{{message.userFullName}}</span>
        <div class="recall">
          <ICRecall></ICRecall>
          <I class="text">{{getContent}}</I>
          <span class="time-place"></span>
          <span class="time">{{message.lt}}</span>
        </div>
      </div>
    </BadgeItem>
  </div>
</template>
<script>
import ICRecall from '@/assets/images/if_recall.svg'
import BadgeItem from './BadgeItem'
import { getNameColorById } from '@/utils/util.js'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
  components: {
    ICRecall,
    BadgeItem
  },
  computed: {
    getContent: function() {
      let { message, me } = this
      if (message.userId === me.user_id) {
        return this.$t('chat.chat_recall_me')
      } else {
        return this.$t('chat.chat_recall_delete')
      }
    }
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
  .username {
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.2rem;
    min-width: 2rem;
    min-height: 0.85rem;
  }
}
.bubble {
  position: relative;
  display: inline-block;
  font-size: 0;
  max-width: 80%;
  border-radius: 0.2rem;
  text-align: left;
  word-break: break-all;
  user-select: text;
  font-size: 1rem;
  padding: 0.4rem 0.6rem;
  .text {
    margin-left: 0.3rem;
  }
  .time-place {
    float: right;
    margin-left: 0.6rem;
    width: 2rem;
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
}
.layout.send {
  flex-direction: row-reverse;
  .bubble {
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
}
.layout.receive {
  flex-direction: row;
  .bubble {
    background: white;
    margin-left: 0.8rem;
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
}
</style>
