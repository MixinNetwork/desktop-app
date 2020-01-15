<template>
  <div class="message" :style="abg">
    <div class="diver" :style="bg"></div>
    <div class="layout">
      <span class="name" :style="font">{{message.userFullName}}</span>
      <span class="content">
        <svg-icon icon-class="if_recall" class="replay_icon" v-if="message.type === 'MESSAGE_RECALL'" />
        <svg-icon icon-class="ic_message_audio" class="replay_icon" v-else-if="messageType() === 'audio'" />
        <svg-icon icon-class="ic_message_photo" class="replay_icon" v-else-if="messageType() === 'image'" />
        <svg-icon icon-class="ic_message_video" class="replay_icon" v-else-if="messageType() === 'video'" />
        <svg-icon icon-class="ic_message_video" class="replay_icon" v-else-if="messageType() === 'live'" />
        <svg-icon icon-class="ic_message_file" class="replay_icon" v-else-if="messageType() === 'file'" />
        <svg-icon icon-class="ic_message_contact" class="replay_icon" v-else-if="messageType() === 'contact'" />
        <svg-icon icon-class="ic_message_transfer" class="replay_icon" v-else-if="messageType() === 'transfer'" />
        <svg-icon icon-class="ic_message_bot_menu"
          class="replay_icon"
          v-else-if="messageType() === 'app_card' ||messageType() === 'app_button'"
        />
        {{getContent}}
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
<script>
import { getNameColorById } from '@/utils/util'
import Avatar from '@/components/Avatar'
import userDao from '@/dao/user_dao'
import { messageType } from '@/utils/constants'

export default {
  props: ['message', 'me'],
  data() {
    return {}
  },
  components: {
    Avatar
  },
  computed: {
    bg: function() {
      let color = getNameColorById(this.message.userId)
      return { background: color }
    },
    abg: function() {
      let color = getNameColorById(this.message.userId)
      return { background: color + '0D' }
    },
    font: function() {
      let color = getNameColorById(this.message.userId)
      return { color: color }
    },
    mediaUrl: function() {
      if (this.message.mediaUrl) {
        return this.message.mediaUrl
      } else if (this.message.assetUrl) {
        return this.message.assetUrl
      }
      return null
    },
    getContent: function() {
      if (this.message.type.endsWith('_TEXT')) {
        return this.message.content
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
        return this.$moment(Math.ceil((this.message.mediaDuration - 0) / 1000) * 1000).format('mm:ss')
      } else if (this.message.type.startsWith('APP_CARD')) {
        return JSON.parse(this.message.content).description
      } else if (this.message.type.endsWith('_DATA')) {
        return this.message.mediaName
      } else if (this.message.type.endsWith('_CONTACT')) {
        return this.message.sharedUserIdentityNumber
      } else {
        return null
      }
    },
    user: function() {
      return userDao.findUserById(this.message.sharedUserId)
    }
  },
  methods: {
    media: message => {
      if (message.mediaUrl === null || message.mediaUrl === undefined || message.mediaUrl === '') {
        return 'data:' + message.mediaMimeType + ';base64,' + message.thumbImage
      }
      return message.mediaUrl
    },
    messageType() {
      return messageType(this.message.type)
    }
  }
}
</script>
<style lang="scss" scoped>
.message {
  border-radius: 0.2rem;
  overflow: hidden;
  margin-bottom: 0.1875rem;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  .diver {
    width: 0.4rem;
  }
  .layout {
    flex: 1;
    padding: 0.1875rem;
    display: flex;
    overflow: hidden;
    flex-direction: column;

    .name {
      font-size: 0.7rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .content {
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      color: #9b9b9b;
      font-size: 0.8rem;
    }
  }
  .image {
    width: 2.5rem;
    height: 2.5rem;
    margin-left: 0.4rem;
    object-fit: cover;
  }
  .avatar {
    width: 2.25rem;
    height: 2.25rem;
    margin: 0.25rem;
    margin-left: 0.4rem;
  }
  .replay_icon {
    height: 0.875rem;
    vertical-align: text-top;
  }
}
</style>
