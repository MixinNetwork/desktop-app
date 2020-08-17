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
          class="reply_icon photo"
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
          v-else-if="messageType() === 'app_card' || messageType() === 'app_button_group'"
        />
        <span v-html="$w(getContent)"></span>
      </span>
    </div>
    <img
      class="image"
      v-if="messageType() === 'image' && (message.mediaUrl || message.assetUrl)"
      :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      :onerror="`this.src='${defaultImg}';this.onerror=null`"
      :src="mediaUrl"
    />
    <img
      class="image"
      v-if="messageType() === 'video'"
      :src="'data:image/jpeg;base64,' + message.thumbImage"
      :onerror="`this.src='${defaultImg}';this.onerror=null`"
    />

    <img
      class="image"
      v-if="messageType() === 'sticker' && (message.mediaUrl || message.assetUrl)"
      :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      :src="mediaUrl"
      :onerror="`this.src='${defaultImg}';this.onerror=null`"
    />
    <img
      class="image"
      v-if="messageType() === 'contact'"
      :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      :src="message.sharedUserAvatarUrl"
      :onerror="`this.src='${defaultImg}';this.onerror=null`"
    />
    <img
      class="image"
      v-if="messageType() === 'live' && (message.thumbUrl)"
      :src="message.thumbUrl"
      :onerror="`this.src='${defaultImg}';this.onerror=null`"
    />
    <span class="icon-close" @click="$emit('hidenReplyBox')">
      <svg-icon style="font-size: 1.2rem" icon-class="ic_close" />
    </span>
  </div>
</template>
<script lang="ts">
import { getNameColorById } from '@/utils/util'
import { messageType, DefaultImg } from '@/utils/constants'
import contentUtil from '@/utils/content_util'

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

  get defaultImg() {
    return DefaultImg
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
    const curMessageType = this.messageType()
    if (curMessageType === 'text') {
      let { mentions, content } = this.message
      content = contentUtil.renderUrl(content)
      content = contentUtil.renderMention(content, mentions)
      return content
    } else if (curMessageType === 'sticker') {
      return this.$t('chat.chat_sticker')
    } else if (curMessageType === 'image') {
      return this.$t('chat.chat_pic')
    } else if (this.message.type === 'MESSAGE_RECALL') {
      let { message, me } = this
      if (message.userId === me.user_id) {
        return this.$t('chat.chat_recall_me')
      } else {
        return this.$t('chat.chat_recall_delete')
      }
    } else if (curMessageType === 'video') {
      return this.$t('chat.chat_video')
    } else if (curMessageType === 'audio') {
      return this.$moment((Math.round((this.message.mediaDuration - 0) / 1000) || 1) * 1000).format('mm:ss')
    } else if (curMessageType === 'file') {
      return this.message.mediaName
    } else if (curMessageType === 'app_card') {
      return JSON.parse(this.message.content).description
    } else if (curMessageType === 'contact') {
      return this.message.sharedUserIdentityNumber
    } else if (curMessageType === 'live') {
      return this.$t('chat.chat_live')
    } else if (curMessageType === 'location') {
      return this.$t('chat.chat_location')
    } else if (curMessageType === 'post') {
      return this.$t('chat.chat_post')
    } else {
      return null
    }
  }

  media(message: any) {
    if (!message.mediaUrl) {
      if (!message.thumbImage) {
        return this.defaultImg
      }
      return 'data:' + message.mediaMimeType + ';base64,' + message.thumbImage
    }
    return message.mediaUrl
  }
  messageType() {
    const { type, content } = this.message
    return messageType(type, content)
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
    width: 0.2rem;
  }
  .layout {
    flex: 1;
    padding: 0.15rem;
    display: flex;
    overflow: hidden;
    flex-direction: column;

    .name {
      font-size: 0.8rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.2rem;
    }
    .content {
      font-size: 0.8rem;
      line-height: 0.9rem;
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
    width: 2rem;
    height: 2rem;
    margin-top: 0.15rem;
    margin-left: 0.3rem;
    object-fit: cover;
  }
  .icon-close {
    cursor: pointer;
    align-self: center;
    margin-right: 0.3rem;
  }
  .reply_icon {
    height: 0.85rem;
    vertical-align: text-top;
    &.photo {
      height: 0.65rem;
      margin: 0.1rem 0.15rem 0 0;
    }
  }
}
</style>
