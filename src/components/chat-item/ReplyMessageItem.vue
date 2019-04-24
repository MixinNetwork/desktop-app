<template>
  <div class="message" :style="abg">
    <div class="diver" :style="bg"></div>
    <div class="layout">
      <span class="name" :style="font">{{message.userFullName}}</span>
      <span class="content">{{getContent}}</span>
    </div>
    <img
      class="image"
      v-if="message.mediaUrl || message.assetUrl"
      v-bind:loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
      v-bind:src="mediaUrl"
    >
  </div>
</template>
<script>
import { getColorById } from '@/utils/util.js'
export default {
  props: ['message'],
  data() {
    return {}
  },
  computed: {
    bg: function() {
      let color = getColorById(this.message.userId)
      return { background: color }
    },
    abg: function() {
      let color = getColorById(this.message.userId)
      return { background: color + '0D' }
    },
    font: function() {
      let color = getColorById(this.message.userId)
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
    }
  }
}
</script>
<style lang="scss" scoped>
.message {
  border-radius: 0.2rem;
  overflow: hidden;
  margin-bottom: 3px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  .diver {
    width: 0.4rem;
  }
  .layout {
    flex: 1;
    padding: 3px;
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
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      color: #9b9b9b;
      font-size: 0.8rem;
    }
  }
  .image {
    width: 40px;
    height: 40px;
    margin-left: 0.4rem;
    object-fit: cover;
  }
}
</style>
