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
          <spinner class="loading" v-if="loading"></spinner>
          <AttachmentIcon
            v-else-if="MediaStatus.CANCELED === message.mediaStatus || MediaStatus.EXPIRED === message.mediaStatus"
            @mediaClick="$emit('mediaClick')"
            :me="me"
            :message="message"
          ></AttachmentIcon>
          <div class="ic" v-else>
            <span class="text">FILE</span>
          </div>
          <div class="content">
            <span class="name" v-html="fileName"></span>
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
import spinner from '@/components/Spinner.vue'
import AttachmentIcon from '@/components/AttachmentIcon.vue'
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
    spinner,
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

  MessageStatus: any = MessageStatus
  MediaStatus: any = MediaStatus
  $electron: any

  openFile() {
    if (!this.message.mediaUrl || this.message.mediaStatus === MediaStatus.CANCELED) {
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

  get loading() {
    return this.attachment.includes(this.message.messageId)
  }
  get fileName() {
    let name = this.message.mediaName
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
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  .username {
    margin-left: 0.4rem;
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.2rem;
    min-width: 2rem;
    min-height: 0.85rem;
  }
  .file {
    background: white;
    display: flex;
    flex-direction: row;
    align-content: center;
    width: 12rem;
    border-radius: 0.4rem;
    box-shadow: 0px 1px 1px #77777733;
    flex-wrap: wrap;
    .reply {
      width: 100%;
      margin-bottom: 0;
    }
    .loading {
      width: 2.5rem;
      height: 2.5rem;
      margin: 0.75rem;
    }
    .ic {
      margin: 0.75rem;
      background: #f2f2f6;
      border-radius: 1.25rem;
      display: flex;
      height: 2.5rem;
      justify-content: center;
      align-items: center;
      .text {
        width: 2.5rem;
        color: #a5a5a4;
        text-align: center;
        font-size: 0.7rem;
        font-weight: 500;
      }
    }
    .content {
      padding: 0.75rem 0.75rem 0.75rem 0;
      display: flex;
      flex: 1;
      flex-direction: column;
      text-align: start;
      overflow: hidden;
      .name {
        font-size: 1rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .bottom {
        display: flex;
        justify-content: space-between;
        .number {
          color: #888888cc;
          font-size: 0.8rem;
          margin-top: 0.375rem;
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
