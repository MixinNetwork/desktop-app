<template>
  <div class="layout" :class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="content">
          <video class="media" :src="message.mediaUrl" controls="controls" :style="video"></video>
          <div class="bottom">
            <TimeAndStatus :relative="true" :message="message" />
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script>
import BadgeItem from './BadgeItem'
import TimeAndStatus from './TimeAndStatus'
import { MessageStatus } from '@/utils/constants'
import { mapGetters } from 'vuex'
import { getNameColorById } from '@/utils/util'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
  components: {
    BadgeItem,
    TimeAndStatus
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
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  .username {
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.2rem;
    margin-left: 0.4rem;
    min-width: 2rem;
    min-height: 0.85rem;
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
