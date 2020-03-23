<template>
  <div class="layout" :class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId), maxWidth: `calc(${borderSetObject(true)}px)`}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem
        @handleMenuClick="$emit('handleMenuClick')"
        :style="{maxWidth: `calc(${borderSetObject(true)}px)`}"
        :type="message.type"
      >
        <div class="content">
          <div class="set" :style="borderSet()">
            <div class="image" :style="borderSetObject()" @click="$emit('liveClick')"></div>
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
<script lang="ts">
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import { MessageStatus } from '@/utils/constants'
import { getNameColorById, convertRemToPixels } from '@/utils/util'

import { Vue, Prop, Component } from 'vue-property-decorator'
let maxWidth = convertRemToPixels(10)
let maxHeight = convertRemToPixels(15)

@Component({
  components: {
    BadgeItem,
    TimeAndStatus
  }
})
export default class LiveItem extends Vue {
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
  getColor(id: string) {
    return getNameColorById(id)
  }
  borderSet() {
    let { message } = this
    if (1.5 * message.mediaWidth > message.mediaHeight || 3 * message.mediaWidth < message.mediaHeight) {
      return 'width-set'
    }
    return 'height-set'
  }

  borderSetObject(getWidth: boolean) {
    const { message } = this
    let width = Math.min(message.mediaWidth, maxWidth)
    const scale = message.mediaWidth / message.mediaHeight
    if (1.5 * message.mediaWidth > message.mediaHeight || 3 * message.mediaWidth < message.mediaHeight) {
      if (getWidth) {
        return width
      }
      if (message.quoteContent) {
        width -= 4
      }
      return { width: `${width}px`, height: `${width / scale}px`, backgroundImage: `url(${message.thumbUrl})` }
    }
    const height = Math.min(message.mediaHeight, maxHeight)
    if (getWidth) {
      return height * scale
    }
    width = height * scale
    if (message.quoteContent) {
      width -= 4
    }
    return { width: `${width}px`, height: `${height}px`, backgroundImage: `url(${message.thumbUrl})` }
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  .username {
    display: inline-block;
    font-size: 0.65rem;
    margin-left: 0.3rem;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.15rem;
    min-width: 1.6rem;
    min-height: 0.65rem;
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
      margin-left: 0.3rem;
      margin-top: 0.15rem;
      padding-left: 0.15rem;
      padding-right: 0.15rem;
      padding-top: 0.05rem;
      padding-bottom: 0.05rem;
      color: white;
      background: #ec4f7d;
      font-size: 0.45rem;
      border-radius: 0.1rem;
    }
    .play {
      width: 1.5rem;
      height: 1.5rem;
      position: absolute;
      margin: auto;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      z-index: 10;
    }
    .loading {
      width: 1.6rem;
      height: 1.6rem;
      left: 50%;
      top: calc(50% - 0.4rem);
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 3;
    }
    .set {
      max-width: 8rem;
      max-height: 12rem;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      .image {
        background: #333;
        background-size: cover;
        background-position: center;
        border-radius: 0.2rem;
      }
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
