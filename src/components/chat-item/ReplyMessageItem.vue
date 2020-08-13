<template>
  <div class="message" :style="!message ? 'background: #f1f1f1' : abg">
    <div class="diver" :style="!message ? 'background: #157efb' : bg"></div>
    <div class="layout" @click.stop="reply">
      <span class="name" v-if="message" :style="font">{{message.userFullName}}</span>
      <span class="content" :class="{recall: !message}">
        <svg-icon
          icon-class="if_recall"
          class="reply_icon"
          v-if="!message || message.type === 'MESSAGE_RECALL'"
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
          icon-class="ic_message_file"
          class="reply_icon"
          v-else-if="messageType() === 'post'"
        />
        <svg-icon
          icon-class="ic_message_location"
          class="reply_icon"
          v-else-if="messageType() === 'location'"
        />
        <svg-icon
          icon-class="ic_message_transfer"
          class="reply_icon"
          v-else-if="messageType() === 'transfer'"
        />
        <svg-icon
          icon-class="ic_message_bot_menu"
          class="reply_icon"
          v-else-if="messageType() === 'app_card' || messageType() === 'app_button_group'"
        />
        <span v-html="$w(htmlEscape(getContent))"></span>
      </span>
    </div>
    <img
      class="image"
      v-if="messageType() === 'image' && (message.mediaUrl || message.assetUrl)"
      :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      :src="mediaUrl"
      :onerror="`this.src='${defaultImg}';this.onerror=null`"
    />
    <img
      class="image"
      v-if="messageType() === 'video'"
      :src="'data:image/jpeg;base64,' + message.thumbImage"
      :onerror="`this.src='${defaultImg}';this.onerror=null`"
    />

    <img
      class="image"
      v-if="messageType() === 'live' && message.thumbUrl"
      :src="message.thumbUrl"
      :onerror="`this.src='${defaultImg}';this.onerror=null`"
    />
    <img
      class="image"
      v-if="messageType() === 'sticker' && (message.mediaUrl || message.assetUrl)"
      :loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      :src="mediaUrl"
      :onerror="`this.src='${defaultImg}';this.onerror=null`"
    />
    <Avatar class="avatar" v-if="messageType() === 'contact'" id="avatar" :user="user" />
  </div>
</template>
<script lang="ts">
import { getNameColorById } from '@/utils/util'
import Avatar from '@/components/Avatar.vue'
import userDao from '@/dao/user_dao'
import { messageType, DefaultImg } from '@/utils/constants'
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
    const curMessageType = this.messageType()
    if (!this.message) {
      return this.$t('chat.chat_message_not_found')
    }
    if (curMessageType === 'text') {
      let { mentions, content } = this.message
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
    } else if (curMessageType === 'live') {
      return this.$t('chat.chat_live')
    } else if (curMessageType === 'audio') {
      return this.$moment((Math.round((this.message.mediaDuration - 0) / 1000) || 1) * 1000).format('mm:ss')
    } else if (curMessageType === 'app_card') {
      return JSON.parse(this.message.content).description
    } else if (curMessageType === 'file') {
      return this.message.mediaName
    } else if (curMessageType === 'contact') {
      return this.message.sharedUserIdentityNumber
    } else if (curMessageType === 'location') {
      return this.$t('chat.chat_location')
    } else if (curMessageType === 'post') {
      return contentUtil.renderMdToText(this.message.content.substr(0, 50))
    } else {
      return null
    }
  }

  get defaultImg() {
    return DefaultImg
  }

  get user() {
    return userDao.findUserById(this.message.sharedUserId)
  }

  reply() {
    if (!this.message) return
    this.$root.$emit('goSearchMessagePos', {
      message: this.message,
      keyword: '',
      goSearchMessagePos: 'reply'
    })
  }
  htmlEscape(content: any) {
    return contentUtil.htmlEscape(content)
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
    if (!this.message) return ''
    const { type, content } = this.message
    return messageType(type, content)
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
    text-align: left;

    .name {
      font-size: 0.55rem;
      line-height: 1rem;
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
      &.recall {
        padding: 0.15rem;
        font-size: 0.65rem;
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
