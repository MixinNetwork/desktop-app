<template>
  <span class="layout" :class="messageOwnership()">
    <span class="root">
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="img-box" :style="getStyle">
          <Lottie v-if="loaded && message.assetType === 'json'" :path="message.assetUrl" />
          <img v-else-if="loaded" :src="message.assetUrl" />
        </div>
      </BadgeItem>
      <TimeAndStatus :relative="true" style="padding-right: 0.3rem" :message="message" />
    </span>
  </span>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import { downloadSticker } from '@/utils/attachment_util'
import { MessageStatus } from '@/utils/constants'
import { getNameColorById } from '@/utils/util'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import Lottie from '@/components/lottie/Lottie.vue'
import stickerDao from '@/dao/sticker_dao'

@Component({
  components: {
    BadgeItem,
    TimeAndStatus,
    Lottie
  }
})
export default class StickerItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  loaded: boolean = false
  MessageStatus: any = MessageStatus

  get getStyle() {
    const { assetWidth, assetHeight } = this.message
    const scale = assetWidth / assetHeight
    const height = assetHeight < 96 ? assetHeight : 96
    const width = height * scale
    return { height: `${height}px`, width: `${width}px` }
  }

  mounted() {
    const { assetUrl, stickerId } = this.message
    if (!assetUrl) {
      return downloadSticker(stickerId).then(() => {
        const stickerData = stickerDao.getStickerByUnique(stickerId)
        if (stickerData) {
          this.message.assetUrl = stickerData.asset_url
          this.message.assetWidth = stickerData.asset_width
          this.message.assetHeight = stickerData.asset_height
          this.loaded = true
        }
      })
    }
    if (this.message.fastLoad) {
      this.loaded = true
    } else {
      requestAnimationFrame(() => {
        this.loaded = true
      })
    }
  }

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
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  .root {
    max-width: 14rem;
    display: flex;
    overflow: hidden;
    flex-direction: column;
    .username {
      display: inline-block;
      font-size: 0.65rem;
      max-width: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      margin-bottom: 0.15rem;
      margin-left: 0.3rem;
      min-width: 1.6rem;
      min-height: 0.65rem;
    }
    .img-box {
      max-height: 4.8rem;
      border-radius: 0.2rem;
      overflow: hidden;
      img {
        height: 100%;
      }
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
