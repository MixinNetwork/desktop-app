<template>
  <div class="post-item layout" :class="messageOwnership()">
    <div class="item-title">
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
    </div>
    <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
      <div class="content">
        <div class="post">
          <VueMarkdown class="inner">{{message.content}}</VueMarkdown>
        </div>
        <div class="bottom">
          <span class="time">
            <svg-icon icon-class="ic_status_lock" v-if="/^SIGNAL_/.test(message.type)" class="icon lock" />
            <span>{{message.lt}}</span>
            <svg-icon icon-class="ic_status_clock"
              v-if="message.userId === me.user_id && (message.status === MessageStatus.SENDING)"
              class="icon"
            />
            <svg-icon icon-class="ic_status_send"
              v-else-if="message.userId === me.user_id && message.status === MessageStatus.SENT"
              class="icon"
            />
            <svg-icon icon-class="ic_status_read"
              v-else-if="message.userId === me.user_id && message.status === MessageStatus.DELIVERED"
              class="icon wait"
            />
            <svg-icon icon-class="ic_status_read"
              v-else-if="message.userId === me.user_id && message.status === MessageStatus.READ"
              class="icon"
            />
          </span>
        </div>
      </div>
    </BadgeItem>
  </div>
</template>
<script>
import BadgeItem from './BadgeItem'
import VueMarkdown from 'vue-markdown'
import { MessageStatus } from '@/utils/constants'
import { mapGetters } from 'vuex'
import { getNameColorById } from '@/utils/util'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
  components: {
    BadgeItem,
    VueMarkdown
  },
  data: function() {
    return {
      MessageStatus: MessageStatus
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
  },
  computed: {
    ...mapGetters({
      attachment: 'attachment'
    })
  }
}
</script>
<style lang="scss" scoped>
.post-item {
  display: flex;
  margin-left: 0.8rem;
  margin-right: 0.8rem;
  flex-direction: column;
  .username {
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    min-width: 2rem;
    min-height: 0.85rem;
  }
  .item-title, .layout {
    max-width: 30rem;
    width: 100%;
    flex: 1;
  }
  .content {
    flex-direction: column;
    text-align: start;
    overflow: hidden;

    .post {
      box-sizing: border-box;
      height: 10rem;

      font-size: 0.75rem;
      border-radius: 0.2rem;
      background-color: white;
      padding: 1rem;
      .inner {
        height: 100%;
        word-break: break-word;
        overflow: hidden;
      }
    }
    .bottom {
      display: flex;
      justify-content: flex-end;
      .time {
        color: #8799a5;
        display: flex;
        float: right;
        font-size: 0.75rem;
        bottom: 0.2rem;
        right: 0.2rem;
        align-items: flex-end;
        .icon {
          width: .875rem;
          height: .875rem;
          padding-left: 0.2rem;
          &.lock {
            width: .55rem;
            margin-right: 0.2rem;
          }
        }
        .wait {
          path {
            fill: #859479;
          }
        }
      }
    }
  }
  &.send {
    align-items: flex-end;
  }
}
</style>
