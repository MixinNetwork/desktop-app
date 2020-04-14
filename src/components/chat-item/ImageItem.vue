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
        :isLongPicture="isLongPicture"
      >
        <div class="content" :class="{zoom: !waitStatus, reply: message.quoteContent}">
          <div class="content-in">
            <div class="set">
              <ReplyMessageItem
                v-if="message.quoteContent"
                :message="JSON.parse(message.quoteContent)"
                :me="me"
                class="reply"
              ></ReplyMessageItem>
              <div :style="borderSetObject()">
                <img
                  v-if="loaded"
                  class="image"
                  style="width: 100%"
                  :src="media()"
                  :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
                  @click="preview"
                />
              </div>
            </div>
            <div v-if="loading" class="loading" @click.stop="stopLoading">
              <svg-icon class="stop" icon-class="loading-stop-black" />
              <spinner class="circle" color="#fff"></spinner>
            </div>
            <AttachmentIcon
              v-else-if="waitStatus"
              class="loading"
              :me="me"
              :message="message"
              @mediaClick="$emit('mediaClick')"
            ></AttachmentIcon>
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
import { Vue, Prop, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

import spinner from '@/components/Spinner.vue'
import AttachmentIcon from '@/components/AttachmentIcon.vue'
import ReplyMessageItem from './ReplyMessageItem.vue'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import { MessageStatus, MediaStatus } from '@/utils/constants'
import { getNameColorById, convertRemToPixels } from '@/utils/util'

import messageDao from '@/dao/message_dao'

@Component({
  components: {
    ReplyMessageItem,
    BadgeItem,
    spinner,
    AttachmentIcon,
    TimeAndStatus
  }
})
export default class ImageItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  @Getter('attachment') attachment: any
  @Getter('currentMessages') currentMessages: any

  loaded: boolean = false
  $imageViewer: any
  MessageStatus: any = MessageStatus
  MediaStatus: any = MediaStatus

  messageOwnership() {
    let { message, me } = this
    return {
      send: message.userId === me.user_id,
      receive: message.userId !== me.user_id
    }
  }

  mounted() {
    if (this.message.fastLoad) {
      this.loaded = true
    } else {
      requestAnimationFrame(() => {
        this.loaded = true
      })
    }
  }

  getColor(id: string) {
    return getNameColorById(id)
  }

  preview() {
    if (this.message.type.endsWith('_IMAGE') && this.message.mediaUrl) {
      let position = 0
      let local = messageDao.findImages(this.conversation.conversationId, this.currentMessages[0].messageId)
      let images = local.map((item: any, index: any) => {
        if (item.message_id === this.message.messageId) {
          position = index
        }
        return { url: item.media_url, width: item.media_width, height: item.media_height }
      })
      this.$imageViewer.images(images)
      this.$imageViewer.index(position)
      this.$imageViewer.show()
    }
  }
  media() {
    const { message } = this
    if (message.mediaUrl === null || message.mediaUrl === undefined || message.mediaUrl === '') {
      return 'data:' + message.mediaMimeType + ';base64,' + message.thumbImage
    }
    return message.mediaUrl
  }

  borderSetObject(getWidth: boolean) {
    const maxWidth = convertRemToPixels(8)
    const maxHeight = convertRemToPixels(12)
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
      return { width: `${width}px`, height: `${width / scale}px` }
    }
    const height = Math.min(message.mediaHeight, maxHeight)
    if (getWidth) {
      return height * scale
    }
    width = height * scale
    if (message.quoteContent) {
      width -= 4
    }
    return { width: `${width}px`, height: `${height}px` }
  }

  get isLongPicture() {
    const { mediaWidth, mediaHeight } = this.message
    return 3 * mediaWidth < mediaHeight
  }

  stopLoading() {
    this.$store.dispatch('stopLoading', this.message.messageId)
  }
  get waitStatus() {
    const { message } = this
    return (
      MediaStatus.CANCELED === message.mediaStatus ||
      MediaStatus.EXPIRED === message.mediaStatus ||
      MediaStatus.PENDING === message.mediaStatus
    )
  }
  get loading() {
    return this.attachment.includes(this.message.messageId)
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
    .content-in {
      font-size: 0;
    }
    &.reply {
      .content-in {
        background: #fff;
        padding: 0.1rem;
        border-radius: 0.2rem;
        .loading {
          top: calc(50% + 0.6rem);
        }
      }
    }
    .reply {
      margin-bottom: 0.1rem;
    }
    &.zoom {
      cursor: zoom-in;
    }
    .loading {
      width: 1.6rem;
      height: 1.6rem;
      left: 50%;
      top: calc(50% - 0.4rem);
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 3;
      .stop {
        width: 100%;
        height: 100%;
        left: 0;
        z-index: 0;
        position: absolute;
        line-height: 100%;
        cursor: pointer;
      }
      .circle {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    }
    .set {
      max-width: 8rem;
      max-height: 12rem;
      overflow: hidden;
      position: relative;
      .image {
        border-radius: 0.2rem;
      }
      font-size: 0;
    }
    .bottom {
      display: flex;
      justify-content: flex-end;
      padding: 0.1rem;
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
