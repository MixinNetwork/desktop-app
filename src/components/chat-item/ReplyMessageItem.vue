<template>
  <div class="message" :style="abg">
    <div class="diver" :style="bg"></div>
    <div class="layout" @click.stop="reply">
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
          icon-class="ic_message_video"
          class="reply_icon"
          v-else-if="messageType() === 'live'"
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
          icon-class="ic_message_bot_menu"
          class="reply_icon"
          v-else-if="messageType() === 'app_card' || messageType() === 'app_button'"
        />
        <vue-markdown
          :anchorAttributes="{target: '_blank', rel: 'noopener noreferrer nofollow', onclick: 'linkClick(this.href)'}"
          class="markdown"
          v-if="messageType() === 'post'"
        >{{getContent}}</vue-markdown>
        <span v-else v-html="getContent"></span>
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
      v-if="message.type.endsWith('_LIVE') && message.thumbUrl"
      :src="message.thumbUrl"
    />
    <img
      class="image"
      v-if="message.type.endsWith('_STICKER') && (message.mediaUrl || message.assetUrl)"
      :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      :src="mediaUrl"
    />
    <Avatar class="avatar" v-if="message.type.endsWith('_CONTACT')" id="avatar" :user="user" />
  </div>
</template>
<script lang="ts">
import { getNameColorById } from '@/utils/util'
import Avatar from '@/components/Avatar.vue'
import userDao from '@/dao/user_dao'
import { messageType } from '@/utils/constants'
import contentUtil from '@/utils/content_util'

import { Vue, Prop, Component } from 'vue-property-decorator'

@Component({
  components: {
    Avatar
  }
})
export default class ReplyMessageItem extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any

  $moment: any

  get bg() {
    let color = getNameColorById(this.message.userId)
    return { background: color }
  }
  get abg() {
    let color = getNameColorById(this.message.userId)
    return { background: color + '0D' }
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
      let { mentions, content } = this.message
      content = contentUtil.renderMention(content, mentions)
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
    } else if (this.message.type.endsWith('_LIVE')) {
      return this.$t('chat.chat_live')
    } else if (this.message.type.endsWith('_AUDIO')) {
      return this.$moment((Math.round((this.message.mediaDuration - 0) / 1000) || 1) * 1000).format('mm:ss')
    } else if (this.message.type.startsWith('APP_CARD')) {
      return JSON.parse(this.message.content).description
    } else if (this.message.type.endsWith('_DATA')) {
      return this.message.mediaName
    } else if (this.message.type.endsWith('_CONTACT')) {
      return this.message.sharedUserIdentityNumber
    } else if (this.message.type.endsWith('_POST')) {
      return this.message.content.substr(0, 500)
    } else {
      return null
    }
  }
  get user() {
    return userDao.findUserById(this.message.sharedUserId)
  }

  reply() {
    this.$root.$emit('goSearchMessagePos', {
      message: this.message,
      keyword: '',
      goSearchMessagePos: 'reply'
    })
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
  border-radius: 0.2rem;
  overflow: hidden;
  margin-bottom: 0.15rem;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  user-select: none;

  .diver {
    width: 0.2rem;
  }
  .layout {
    flex: 1;
    padding: 0.15rem;
    display: flex;
    overflow: hidden;
    flex-direction: column;
    cursor: pointer;

    .name {
      font-size: 0.55rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .content {
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      font-size: 0.6rem;
      color: #9b9b9b;
      /deep/ * {
        color: #9b9b9b;
      }
    }
  }
  .markdown {
    color: #9b9b9b;
    max-height: 2rem;
  }
  .image {
    width: 2rem;
    height: 2rem;
    margin-left: 0.3rem;
    object-fit: cover;
  }
  .avatar {
    width: 1.8rem;
    height: 1.8rem;
    margin: 0.2rem;
    margin-left: 0.3rem;
  }
  .reply_icon {
    height: 0.7rem;
    margin-right: 0.15rem;
    vertical-align: text-top;
  }
}
</style>
