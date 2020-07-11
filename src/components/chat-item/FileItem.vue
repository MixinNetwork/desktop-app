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
        <div class="file" @click="openFile">
          <ReplyMessageItem
            v-if="message.quoteContent"
            :message="JSON.parse(message.quoteContent)"
            :me="me"
            class="reply"
          ></ReplyMessageItem>
          <LoadingIcon
            v-if="loading && fetchPercentMap[message.messageId] !== 100"
            class="loading"
            color="rgb(75, 126, 210)"
            :percent="fetchPercentMap[message.messageId]"
            @userClick="stopLoading"
          />
          <AttachmentIcon
            v-else-if="MediaStatus.CANCELED === message.mediaStatus || MediaStatus.EXPIRED === message.mediaStatus || MediaStatus.PENDING === message.mediaStatus"
            @mediaClick="$emit('mediaClick')"
            :me="me"
            :message="message"
          ></AttachmentIcon>
          <div class="ic" v-else>
            <span class="text">FILE</span>
          </div>
          <div class="content">
            <span class="name" v-html="$w(fileName)"></span>
            <div class="bottom">
              <span class="number">{{fileSize}}</span>
              <TimeAndStatus :message="message" />
            </div>
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import fs from 'fs'
import ReplyMessageItem from './ReplyMessageItem.vue'
import AttachmentIcon from '@/components/chat-item/AttachmentIcon.vue'
import LoadingIcon from '@/components/LoadingIcon.vue'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import contentUtil from '@/utils/content_util'
import { MessageStatus, MediaStatus } from '@/utils/constants'
import { mapGetters } from 'vuex'
import { getNameColorById } from '@/utils/util'
import { Vue, Prop, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component({
  components: {
    ReplyMessageItem,
    LoadingIcon,
    AttachmentIcon,
    BadgeItem,
    TimeAndStatus
  }
})
export default class FileItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any
  @Prop(String) readonly searchKeyword: any

  @Getter('attachment') attachment: any
  @Getter('fetchPercentMap') fetchPercentMap: any

  MessageStatus: any = MessageStatus
  MediaStatus: any = MediaStatus
  $electron: any

  openFile() {
    if (!this.message.mediaUrl || this.message.mediaStatus !== MediaStatus.DONE) {
      return
    }
    const savePath = this.$electron.remote.dialog.showSaveDialogSync(this.$electron.remote.getCurrentWindow(), {
      defaultPath: this.message.mediaName
    })
    if (!savePath) {
      return
    }
    let sourcePath = this.message.mediaUrl
    if (sourcePath.startsWith('file://')) {
      sourcePath = sourcePath.replace('file://', '')
    }
    fs.copyFileSync(sourcePath, savePath)
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
  stopLoading() {
    this.$store.dispatch('stopLoading', this.message.messageId)
  }

  get loading() {
    return this.attachment.includes(this.message.messageId)
  }
  get fileName() {
    let name = this.message.mediaName
    if (!name) return
    const str1 = contentUtil.highlight(name.substring(0, 7), this.searchKeyword, 'in-bubble')
    const str2 = contentUtil.highlight(name.substring(name.length - 8, name.length), this.searchKeyword, 'in-bubble')
    if (name && name.length > 18) {
      return `${str1}…${str2}`
    } else {
      return name
    }
  }
  get fileSize() {
    let num = parseFloat(this.message.mediaSize)
    let count = 0
    while (count > 3 || num > 1024) {
      num /= 1024
      count++
    }
    let unit = 'Byte'
    if (count === 1) {
      unit = 'KB'
    } else if (count === 2) {
      unit = 'MB'
    } else if (count === 3) {
      unit = 'GB'
    }
    return `${Math.round(num * 100) / 100} ${unit}`
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  .username {
    margin-left: 0.3rem;
    display: inline-block;
    font-size: 0.65rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.15rem;
    min-width: 1.6rem;
    min-height: 0.65rem;
  }
  .file {
    background: white;
    display: flex;
    flex-direction: row;
    align-content: center;
    min-width: 11rem;
    border-radius: 0.2rem;
    box-shadow: 0 0.05rem 0.05rem #77777733;
    flex-wrap: wrap;
    max-width: 14rem;
    .reply {
      width: 100%;
      margin-bottom: 0;
    }
    .loading {
      position: relative;
      width: 2rem;
      height: 2rem;
      margin: 0.6rem;
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
    .accachment {
      margin: 0.6rem;
    }
    .ic {
      margin: 0.6rem;
      background: #f2f2f6;
      border-radius: 1rem;
      display: flex;
      height: 2rem;
      justify-content: center;
      align-items: center;
      .text {
        width: 2rem;
        color: #a5a5a4;
        text-align: center;
        font-size: 0.5rem;
        font-weight: 500;
      }
    }
    .content {
      padding: 0.6rem 0.6rem 0.6rem 0;
      display: flex;
      flex: 1;
      flex-direction: column;
      text-align: start;
      overflow: hidden;
      .name {
        font-size: 0.8rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .bottom {
        display: flex;
        justify-content: space-between;
        .number {
          color: #888888cc;
          font-size: 0.6rem;
          margin-top: 0.3rem;
        }
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
