<template>
  <div class="layout" v-bind:class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        v-bind:style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <div class="content">
        <video class="media" :src="message.mediaUrl" controls="controls" :style="video"></video>
        <div class="bottom">
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
    </div>
  </div>
</template>
<script>
import ICSending from '@/assets/images/ic_status_clock.svg'
import ICSend from '@/assets/images/ic_status_send.svg'
import ICRead from '@/assets/images/ic_status_read.svg'
import { MessageStatus } from '@/utils/constants.js'
import { mapGetters } from 'vuex'
import { getColorById } from '@/utils/util.js'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
  components: {
    ICSending,
    ICSend,
    ICRead
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
      return getColorById(id)
    }
  },
  computed: {
    video: function() {
      let { mediaWidth, mediaHeight } = this.message
      let width = 200
      let height = (200 / mediaWidth) * mediaHeight
      if (height > 400) {
        height = 400
        width = (400 / mediaHeight) * mediaWidth
      }
      return {
        width: `${width}px`,
        height: `${height}px`
      }
    },
    ...mapGetters({
      attachment: 'attachment'
    })
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
  .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    text-align: start;
    overflow: hidden;
    .media {
      font-size: 1rem;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      border-radius: 0.2rem;
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
}
.layout.send {
  flex-direction: row-reverse;
}
.layout.receive {
  flex-direction: row;
}
</style>
