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
const colors = [
  '#AA4848',
  '#B0665E',
  '#EF8A44',
  '#A09555',
  '#727234',
  '#9CAD23',
  '#AA9100',
  '#C49B4B',
  '#A47758',
  '#DF694C',
  '#D65859',
  '#C2405A',
  '#A75C96',
  '#BD637C',
  '#8F7AC5',
  '#7983C2',
  '#728DB8',
  '#5977C2',
  '#5E6DA2',
  '#3D98D0',
  '#5E97A1',
  '#4EABAA',
  '#63A082',
  '#877C9B',
  '#AA66C3',
  '#BB5334',
  '#667355',
  '#668899',
  '#83BE44',
  '#BBA600',
  '#429AB6',
  '#75856F',
  '#88A299',
  '#B3798E',
  '#447899',
  '#D79200',
  '#728DB8',
  '#DD637C',
  '#887C66',
  '#BE6C2C',
  '#9B6D77',
  '#B69370',
  '#976236',
  '#9D77A5',
  '#8A660E',
  '#5E935E',
  '#9B8484',
  '#92B288'
]
export default {
  props: ['message'],
  data() {
    return {}
  },
  computed: {
    bg: function() {
      let color = colors[parseInt(this.message.userIdentityNumber) % colors.length]
      return { background: color }
    },
    abg: function() {
      let color = colors[parseInt(this.message.userIdentityNumber) % colors.length]
      return { background: color + '0D' }
    },
    font: function() {
      let color = colors[parseInt(this.message.userIdentityNumber) % colors.length]
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
