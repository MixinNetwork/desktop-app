<template>
  <div class="layout" :class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :style="{maxWidth: `calc(${borderSetObject(true)}px + 1.6rem)`}" :type="message.type">
        <div class="content" :class="{zoom: !waitStatus}">
          <div class="set" :style="borderSet()">
            <img
              class="image"
              :src="media()"
              :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
              :style="borderSetObject()"
              @click="preview"
            />
          </div>
          <spinner class="loading" v-if="loading"></spinner>
          <AttachmentIcon
            v-else-if="waitStatus"
            class="loading"
            :me="me"
            :message="message"
            @mediaClick="$emit('mediaClick')"
          ></AttachmentIcon>
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
import {
  Getter
} from 'vuex-class'

import spinner from '@/components/Spinner.vue'
import AttachmentIcon from '@/components/AttachmentIcon.vue'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import { MessageStatus, MediaStatus } from '@/utils/constants'
import { getNameColorById, convertRemToPixels } from '@/utils/util'

import messageDao from '@/dao/message_dao'

let maxWidth = convertRemToPixels(10)
let maxHeight = convertRemToPixels(15)

@Component({
  components: {
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

  getColor(id: string) {
    return getNameColorById(id)
  }

  preview() {
    if (this.message.type.endsWith('_IMAGE') && this.message.mediaUrl) {
      let position = 0
      const messages = this.currentMessages
      let firstImage = null
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].type.endsWith('_IMAGE') && this.message.mediaUrl) {
          firstImage = messages[i]
          break
        }
      }
      if (!firstImage) {
        return setTimeout(() => {
          this.preview()
        }, 100)
      }
      let local = messageDao.findImages(this.conversation.conversationId, firstImage.messageId)
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
  borderSet() {
    const { message } = this
    if (1.5 * message.mediaWidth > message.mediaHeight || 3 * message.mediaWidth < message.mediaHeight) {
      return 'width-set'
    }
    return 'height-set'
  }

  borderSetObject(getWidth: boolean) {
    const { message } = this
    const width = Math.min(message.mediaWidth, maxWidth)
    const scale = message.mediaWidth / message.mediaHeight
    if (1.5 * message.mediaWidth > message.mediaHeight || 3 * message.mediaWidth < message.mediaHeight) {
      if (getWidth) {
        return width
      }
      return { width: `${width}px`, height: `${width / scale}px` }
    }
    const height = Math.min(message.mediaHeight, maxHeight)
    if (getWidth) {
      return height * scale
    }
    return { width: `${height * scale}px`, height: `${height}px` }
  }

  get waitStatus() {
    const { message } = this
    return (MediaStatus.CANCELED === message.mediaStatus || MediaStatus.EXPIRED === message.mediaStatus)
  }
  get loading() {
    return this.attachment.includes(this.message.messageId)
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
    &.zoom {
      cursor: zoom-in;
    }
    .loading {
      width: 2rem;
      height: 2rem;
      left: 50%;
      top: calc(50% - 0.5rem);
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
      .image {
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
