<template>
  <div class="message">
    <div class="diver" :style="bg"></div>
    <div class="layout">
      <span class="name" :style="font">{{message.userFullName}}</span>
      <span class="content">
        <svg-icon icon-class="if_recall" class="replay_icon" v-if="message.type === 'MESSAGE_RECALL'" />
        <svg-icon icon-class="ic_message_audio" class="replay_icon" v-else-if="messageType() === 'audio'" />
        <svg-icon icon-class="ic_message_photo" class="replay_icon" v-else-if="messageType() === 'image'" />
        <svg-icon icon-class="ic_message_video" class="replay_icon" v-else-if="messageType() === 'video'" />
        <svg-icon icon-class="ic_message_file" class="replay_icon" v-else-if="messageType() === 'file'" />
        <svg-icon icon-class="ic_message_contact" class="replay_icon" v-else-if="messageType() === 'contact'" />
        <svg-icon icon-class="ic_message_transfer" class="replay_icon" v-else-if="messageType() === 'transfer'" />
        <svg-icon icon-class="ic_message_video" class="replay_icon" v-else-if="messageType() === 'live'" />
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
<script>
import { getNameColorById } from '@/utils/util'
export default {
  props: ['message', 'me'],
  data() {
    return {}
  },
  computed: {
    bg: function() {
      let color = getNameColorById(this.message.userId)
      return { background: color }
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
      } else if (this.message.type.endsWith('_AUDIO')) {
        return this.formatSeconds(this.message.mediaDuration)
      } else if (this.message.type.endsWith('_DATA')) {
        return this.message.mediaName
      } else if (this.message.type.endsWith('_CONTACT')) {
        return this.message.sharedUserIdentityNumber
      } else if (this.message.type.endsWith('_LIVE')) {
        return this.$t('chat.chat_live')
      } else {
        return null
      }
    }
  },
  methods: {
    media: message => {
      if (message.mediaUrl === null || message.mediaUrl === undefined || message.mediaUrl === '') {
        return 'data:' + message.mediaMimeType + ';base64,' + message.thumbImage
      }
      return message.mediaUrl
    },
    formatSeconds(msd) {
      var time = parseFloat(msd) / 1000
      if (time !== null && time !== '') {
        // let h = parseInt(time / 3600.0)
        let m = parseInt((parseFloat(time / 3600.0) - parseInt(time / 3600.0)) * 60)
        let s = parseInt(
          (parseFloat((parseFloat(time / 3600.0) - parseInt(time / 3600.0)) * 60) -
            parseInt((parseFloat(time / 3600.0) - parseInt(time / 3600.0)) * 60)) *
            60
        )
        if (m < 10) {
          m = '0' + m
        }
        if (s < 10) {
          s = '0' + s
        }
        time = m + ':' + s
      }
      return time
    },
    messageType() {
      let type = this.message.type
      if (type.endsWith('_STICKER')) {
        return 'sticker'
      } else if (type.endsWith('_IMAGE')) {
        return 'image'
      } else if (type.endsWith('_TEXT')) {
        return 'text'
      } else if (type.endsWith('_VIDEO')) {
        return 'video'
      } else if (type.endsWith('_AUDIO')) {
        return 'audio'
      } else if (type.endsWith('_DATA')) {
        return 'file'
      } else if (type.endsWith('_CONTACT')) {
        return 'contact'
      } else if (type.endsWith('_LIVE')) {
        return 'live'
      } else if (type.startsWith('APP_')) {
        if (type === 'APP_CARD') {
          return 'app_card'
        } else {
          return 'app_button'
        }
      } else if (type === 'SYSTEM_ACCOUNT_SNAPSHOT') {
        return 'transfer'
      } else {
        return 'unknown'
      }
    }
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
      font-size: 1rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .content {
      font-size: 1rem;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      color: #9b9b9b;
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
  .replay_icon {
    height: 0.875rem;
    vertical-align: text-top;
  }
}
</style>
