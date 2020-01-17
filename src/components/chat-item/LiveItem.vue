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
          <div class="set" :style="borderSet()">
            <div
              class="image"
              :style="borderSetObject()"
              @click="$emit('liveClick')"
            ></div>
            <svg-icon icon-class="ic_play" class="play" @click="$emit('liveClick')" />
          </div>
          <span class="tag">LIVE</span>
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
import { getNameColorById, convertRemToPixels } from '@/utils/util'
let maxWidth = convertRemToPixels(10)
let maxHeight = convertRemToPixels(15)
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
    messageOwnership() {
      let { message, me } = this
      return {
        send: message.userId === me.user_id,
        receive: message.userId !== me.user_id
      }
    },
    getColor(id) {
      return getNameColorById(id)
    },
    borderSet() {
      let { message } = this
      if (1.5 * message.mediaWidth > message.mediaHeight || 3 * message.mediaWidth < message.mediaHeight) {
        return 'width-set'
      }
      return 'height-set'
    },

    borderSetObject() {
      const { message } = this
      const width = Math.min(message.mediaWidth, maxWidth)
      const scale = message.mediaWidth / message.mediaHeight
      if (1.5 * message.mediaWidth > message.mediaHeight || 3 * message.mediaWidth < message.mediaHeight) {
        return { width: `${width}px`, height: `${width / scale}px`, backgroundImage: `url(${message.thumbUrl})` }
      }
      const height = Math.min(message.mediaHeight, maxHeight)
      return { width: `${height * scale}px`, height: `${height}px`, backgroundImage: `url(${message.thumbUrl})` }
    }
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  .username {
    display: inline-block;
    font-size: 0.85rem;
    max-width: 80%;
    margin-left: 0.8rem;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.2rem;
    min-width: 2rem;
    min-height: 0.85rem;
  }
  .content {
    display: flex;
    flex: 1;
    position: relative;
    flex-direction: column;
    text-align: start;
    overflow: hidden;
    .tag {
      position: absolute;
      margin-left: 1rem;
      margin-top: 0.2rem;
      padding-left: 0.1875rem;
      padding-right: 0.1875rem;
      padding-top: 1px;
      padding-bottom: 1px;
      color: white;
      background: #ec4f7d;
      font-size: 0.6rem;
      border-radius: 0.1rem;
    }
    .play {
      width: 1.875rem;
      height: 1.875rem;
      position: absolute;
      margin: auto;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      z-index: 10;
    }
    .loading {
      width: 2rem;
      height: 2rem;
      left: 50%;
      top: 50%;
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 3;
    }
    .set {
      max-width: 10rem;
      max-height: 15rem;
      margin-left: 0.8rem;
      margin-right: 0.8rem;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      .image {
        background-size: cover;
        background-position: center;
        border-radius: 0.2rem;
      }
    }
    .bottom {
      display: flex;
      justify-content: flex-end;
      margin-right: 0.8rem;
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
