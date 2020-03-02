<template>
  <div class="layout" :class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="content" :class="{reply: message.quoteContent}">
          <div class="content-in">
            <ReplyMessageItem
              v-if="message.quoteContent"
              :message="JSON.parse(message.quoteContent)"
              :me="me"
              class="reply"
            ></ReplyMessageItem>
            <div class="video-box">
              <div v-if="loading" v-show="showLoading" class="loading" @click.stop="stopLoading">
                <svg-icon class="stop" icon-class="loading-stop-black" />
                <spinner class="circle" color="#fff"></spinner>
              </div>
              <AttachmentIcon
                v-else-if="waitStatus"
                class="loading"
                :me="me"
                :message="message"
                @mediaClick="$emit('mediaClick')"
              ></AttachmentIcon>
              <video class="media" ref="videoPlayer" :src="message.mediaUrl" :controls="showLoading || waitStatus" :style="video"></video>
            </div>
          </div>
          <div class="bottom">
            <TimeAndStatus :relative="true" :message="message" />
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import ReplyMessageItem from './ReplyMessageItem.vue'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import spinner from '@/components/Spinner.vue'
import AttachmentIcon from '@/components/AttachmentIcon.vue'
import { MessageStatus, MediaStatus } from '@/utils/constants'
import { getNameColorById } from '@/utils/util'

import { Vue, Prop, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component({
  components: {
    AttachmentIcon,
    ReplyMessageItem,
    spinner,
    BadgeItem,
    TimeAndStatus
  }
})
export default class VideoItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  @Getter('attachment') attachment: any

  MediaStatus: any = MediaStatus
  MessageStatus: any = MessageStatus
  showLoading: boolean = false

  messageOwnership() {
    let { message, me } = this
    return {
      send: message.userId === me.user_id,
      receive: message.userId !== me.user_id
    }
  }
  getColor(id: any) {
    return getNameColorById(id)
  }

  stopLoading() {
    this.$store.dispatch('stopLoading', this.message.messageId)
  }

  mounted() {
    // @ts-ignore
    this.$refs.videoPlayer.oncanplaythrough = () => {
      this.showLoading = true
    }
  }

  get waitStatus() {
    const { message } = this
    return MediaStatus.CANCELED === message.mediaStatus || MediaStatus.EXPIRED === message.mediaStatus
  }
  get loading() {
    return this.attachment.includes(this.message.messageId)
  }

  get video() {
    let { mediaWidth, mediaHeight } = this.message
    let width = 200
    let height = (200 / mediaWidth) * mediaHeight
    if (height > 400) {
      height = 400
      width = (400 / mediaHeight) * mediaWidth
    }
    return {
      width: `${width}px`,
      height: `${height}px`
    }
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
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
  .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    text-align: start;
    overflow: hidden;
    .content-in {
      font-size: 0;
    }
    &.reply {
      .content-in {
        background: #fff;
        padding: 0.1rem 0.15rem 0.15rem;
        border-radius: 0.15rem;
      }
    }
    .reply {
      margin-bottom: 0.1rem;
    }
    .video-box {
      position: relative;
      .loading {
        width: 1.6rem;
        height: 1.6rem;
        left: 50%;
        top: calc(50% - 0.6rem);
        position: absolute;
        transform: translate(-50%, -50%);
        z-index: 3;
        .stop {
          width: 100%;
          height: 100%;
          left: 0;
          z-index: 0;
          position: absolute;
          line-height: 100%;
          cursor: pointer;
        }
        .circle {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
      }
      .media {
        font-size: 0.8rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        border-radius: 0.15rem;
      }
    }
    .bottom {
      display: flex;
      padding: 0.1rem 0;
      justify-content: flex-end;
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
