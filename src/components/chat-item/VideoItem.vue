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
        <div class="content" :class="{reply: message.quoteContent}">
          <div class="content-in">
            <ReplyMessageItem
              v-if="message.quoteContent"
              :message="JSON.parse(message.quoteContent)"
              :me="me"
              class="reply"
            ></ReplyMessageItem>
            <video class="media" :src="message.mediaUrl" controls="controls" :style="video"></video>
          </div>
          <div class="bottom">
            <TimeAndStatus :relative="true" :message="message" />
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import ReplyMessageItem from './ReplyMessageItem.vue'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import { MessageStatus } from '@/utils/constants'
import { getNameColorById } from '@/utils/util'

import { Vue, Prop, Component } from 'vue-property-decorator'

@Component({
  components: {
    ReplyMessageItem,
    BadgeItem,
    TimeAndStatus
  }
})
export default class VideoItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  MessageStatus: any = MessageStatus

  messageOwnership() {
    let { message, me } = this
    return {
      send: message.userId === me.user_id,
      receive: message.userId !== me.user_id
    }
  }
  getColor(id: any) {
    return getNameColorById(id)
  }
  get video() {
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
    .content-in {
      font-size: 0;
    }
    &.reply {
      .content-in {
        background: #fff;
        padding: 0.15rem 0.2rem 0.2rem;
        border-radius: 0.2rem;
      }
    }
    .reply {
      margin-bottom: 0.15rem;
    }
    .media {
      font-size: 1rem;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      border-radius: 0.2rem;
    }
    .bottom {
      display: flex;
      padding: 0.15rem 0;
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
