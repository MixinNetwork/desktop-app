<template>
  <div class="message">
    <div class="diver" :style="bg"></div>
    <div class="layout">
      <span class="name" :style="font">{{message.userFullName}}</span>
      <span class="content">
        <svg-icon
          icon-class="if_recall"
          class="reply_icon"
          v-if="message.type === 'MESSAGE_RECALL'"
        />
        <svg-icon
          icon-class="ic_message_audio"
          class="reply_icon"
          v-else-if="messageType() === 'audio'"
        />
        <svg-icon
          icon-class="ic_message_photo"
          class="reply_icon"
          v-else-if="messageType() === 'image'"
        />
        <svg-icon
          icon-class="ic_message_video"
          class="reply_icon"
          v-else-if="messageType() === 'video'"
        />
        <svg-icon
          icon-class="ic_message_file"
          class="reply_icon"
          v-else-if="messageType() === 'file'"
        />
        <svg-icon
          icon-class="ic_message_contact"
          class="reply_icon"
          v-else-if="messageType() === 'contact'"
        />
        <svg-icon
          icon-class="ic_message_transfer"
          class="reply_icon"
          v-else-if="messageType() === 'transfer'"
        />
        <svg-icon
          icon-class="ic_message_video"
          class="reply_icon"
          v-else-if="messageType() === 'live'"
        />
        <svg-icon
          icon-class="ic_message_file"
          class="reply_icon"
          v-else-if="messageType() === 'post'"
        />
        <svg-icon
          icon-class="ic_message_bot_menu"
          class="reply_icon"
          v-else-if="messageType() === 'app_card' ||messageType() === 'app_button'"
        />
        <span v-html="getContent"></span>
      </span>
    </div>
    <img
      class="image"
      v-if="message.type.endsWith('_IMAGE') && (message.mediaUrl || message.assetUrl)"
      :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      :src="mediaUrl"
    />
    <img
      class="image"
      v-if="message.type.endsWith('_VIDEO') && (message.mediaUrl || message.assetUrl)"
      :src="'data:image/jpeg;base64,' + message.thumbImage"
    />

    <img
      class="image"
      v-if="message.type.endsWith('_STICKER') && (message.mediaUrl || message.assetUrl)"
      :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      :src="mediaUrl"
    />
    <img
      class="image"
      v-if="message.type.endsWith('_CONTACT')"
      :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      :src="message.sharedUserAvatarUrl"
    />
    <img
      class="image"
      v-if="message.type.endsWith('_LIVE') && (message.thumbUrl)"
      :src="message.thumbUrl"
    />
    <span class="icon-close" @click="$emit('hidenReplyBox')">
      <svg-icon style="font-size: 1.5rem" icon-class="ic_close" />
    </span>
  </div>
</template>
<script lang="ts">
import { getNameColorById } from '@/utils/util'
import { messageType } from '@/utils/constants'

import { Vue, Prop, Component } from 'vue-property-decorator'

@Component
export default class ReplyMessageContainer extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any

  $moment: any

  get bg() {
    let color = getNameColorById(this.message.userId)
    return { background: color }
  }

  get font() {
    let color = getNameColorById(this.message.userId)
    return { color: color }
  }
  get mediaUrl() {
    if (this.message.mediaUrl) {
      return this.message.mediaUrl
    } else if (this.message.assetUrl) {
      return this.message.assetUrl
    }
    return null
  }
  get getContent() {
    if (this.message.type.endsWith('_TEXT')) {
      const { mentions, content } = this.message
      if (mentions !== null) {
        return mentions
      }
      return content
    } else if (this.message.type.endsWith('_STICKER')) {
      return this.$t('chat.chat_sticker')
    } else if (this.message.type.endsWith('_IMAGE')) {
      return this.$t('chat.chat_pic')
    } else if (this.message.type === 'MESSAGE_RECALL') {
      let { message, me } = this
      if (message.userId === me.user_id) {
        return this.$t('chat.chat_recall_me')
      } else {
        return this.$t('chat.chat_recall_delete')
      }
    } else if (this.message.type.endsWith('_VIDEO')) {
      return this.$t('chat.chat_video')
    } else if (this.message.type.endsWith('_AUDIO')) {
      return this.$moment((Math.round((this.message.mediaDuration - 0) / 1000) || 1) * 1000).format('mm:ss')
    } else if (this.message.type.endsWith('_DATA')) {
      return this.message.mediaName
    } else if (this.message.type.startsWith('APP_CARD')) {
      return JSON.parse(this.message.content).description
    } else if (this.message.type.endsWith('_CONTACT')) {
      return this.message.sharedUserIdentityNumber
    } else if (this.message.type.endsWith('_LIVE')) {
      return this.$t('chat.chat_live')
    } else if (this.message.type.endsWith('_POST')) {
      return this.$t('chat.chat_post')
    } else {
      return null
    }
  }

  media(message: any) {
    if (message.mediaUrl === null || message.mediaUrl === undefined || message.mediaUrl === '') {
      return 'data:' + message.mediaMimeType + ';base64,' + message.thumbImage
    }
    return message.mediaUrl
  }
  messageType() {
    return messageType(this.message.type)
  }
}
</script>
<style lang="scss" scoped>
.message {
  overflow: hidden;
  display: flex;
  flex-direction: row;
  background: white;
  justify-content: flex-start;
  position: relative;
  z-index: 10;
  .diver {
    width: 0.3rem;
  }
  .layout {
    flex: 1;
    padding: 0.1875rem;
    display: flex;
    overflow: hidden;
    flex-direction: column;

    .name {
      font-size: 1rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.5rem;
    }
    .content {
      font-size: 1rem;
      line-height: 1.125rem;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      color: #9b9b9b;
      /deep/ * {
        color: #9b9b9b;
      }
    }
  }
  .image {
    width: 2.5rem;
    height: 2.5rem;
    margin-top: 0.2rem;
    margin-left: 0.4rem;
    object-fit: cover;
  }
  .icon-close {
    cursor: pointer;
    align-self: center;
    margin-right: 0.4rem;
  }
  .reply_icon {
    height: 1.1rem;
    vertical-align: text-top;
  }
}
</style>
