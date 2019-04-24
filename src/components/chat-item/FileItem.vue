<template>
  <div class="layout" v-bind:class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        v-bind:style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <div class="file" @click="openFile">
        <spinner class="loading" v-if="loading"></spinner>
        <AttachmentIcon
          v-else-if="message.mediaStatus === MediaStatus.CANCELED"
          @mediaClick="$emit('mediaClick')"
          :me="me"
          :message="message"
        ></AttachmentIcon>
        <div class="ic" v-else>
          <span class="text">FILE</span>
        </div>
        <div class="content">
          <span class="name">{{fileName}}</span>
          <div class="bottom">
            <span class="number">{{fileSize}}</span>
            <span class="time">
              {{message.lt}}
              <ICSending
                v-if="message.userId === me.user_id && (message.status === MessageStatus.SENDING || message.status === MessageStatus.PENDING)"
                class="icon"
              />
              <ICSend
                v-else-if="message.userId === me.user_id && message.status === MessageStatus.SENT"
                class="icon"
              />
              <ICRead
                v-else-if="message.userId === me.user_id && message.status === MessageStatus.DELIVERED"
                class="icon wait"
              />
              <ICRead
                v-else-if="message.userId === me.user_id && message.status === MessageStatus.READ"
                class="icon"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import fs from 'fs'
import spinner from '@/components/Spinner.vue'
import ICSending from '@/assets/images/ic_status_clock.svg'
import ICSend from '@/assets/images/ic_status_send.svg'
import AttachmentIcon from '@/components/AttachmentIcon.vue'
import ICRead from '@/assets/images/ic_status_read.svg'
import { MessageStatus, MediaStatus } from '@/utils/constants.js'
import { mapGetters } from 'vuex'
import { getColorById } from '@/utils/util.js'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
  components: {
    spinner,
    ICSending,
    ICSend,
    ICRead,
    AttachmentIcon
  },
  data: function() {
    return {
      MessageStatus: MessageStatus,
      MediaStatus: MediaStatus
    }
  },

  methods: {
    openFile: function() {
      if (!this.message.mediaUrl || this.message.mediaStatus === MediaStatus.CANCELED) {
        return
      }
      const savePath = this.$electron.remote.dialog.showSaveDialog(this.$electron.remote.getCurrentWindow(), {
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
    },
    messageOwnership: function() {
      let { message, me } = this
      return {
        send: message.userId === me.user_id,
        receive: message.userId !== me.user_id
      }
    },
    getColor: function(id) {
      return getColorById(id)
    }
  },
  computed: {
    loading: function() {
      return this.attachment.includes(this.message.messageId)
    },
    fileName: function() {
      let name = this.message.mediaName
      if (name && name.length > 18) {
        return `${name.substring(0, 7)}…${name.substring(name.length - 8, name.length)}`
      } else {
        return name
      }
    },
    fileSize: function() {
      let num = parseFloat(this.message.mediaSize)
      var count = 0
      while (count > 3 || num > 1024) {
        num /= 1024
        count++
      }
      var unit = 'Byte'
      if (count === 1) {
        unit = 'KB'
      } else if (count === 2) {
        unit = 'MB'
      } else if (count === 3) {
        unit = 'GB'
      }
      return `${Math.round(num * 100) / 100} ${unit}`
    },
    ...mapGetters({
      attachment: 'attachment'
    })
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  padding-left: 0.8rem;
  padding-right: 0.8rem;
  .username {
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.2rem;
  }
  .file {
    padding: 12px;
    background: white;
    display: flex;
    flex-direction: row;
    align-content: center;
    width: 12rem;
    border-radius: 0.4rem;
    box-shadow: 1px 1px 1px #33333333;
    .loading {
      width: 40px;
      height: 40px;
      margin-right: 12px;
    }
    .ic {
      margin-right: 12px;
      background: #f2f2f6;
      border-radius: 20px;
      display: flex;
      height: 40px;
      justify-content: center;
      align-items: center;
      .text {
        width: 40px;
        color: #a5a5a4;
        text-align: center;
        font-size: 0.7rem;
        font-weight: 500;
      }
    }
    .content {
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
          color: #88888888;
          font-size: 0.8rem;
          margin-top: 6px;
        }
        .time {
          color: #8799a5;
          display: flex;
          float: right;
          font-size: 0.75rem;
          bottom: 0.3rem;
          right: 0.2rem;
          align-items: flex-end;
          .icon {
            padding-left: 0.2rem;
          }
          .wait {
            path {
              fill: #859479;
            }
          }
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
