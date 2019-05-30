<template>
  <div class="layout" v-bind:class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        v-bind:style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="content">
          <img
            class="image"
            v-bind:src="media(message)"
            v-bind:loading="'data:' + message.mediaMimeType + ';base64,' + message.thumbImage"
            v-bind:class="[borderSet(message),123]"
            v-bind:style="borderSetObject(message)"
            @click="$emit('preview')"
          >
          <spinner class="loading" v-if="loading"></spinner>
          <AttachmentIcon
            v-else
            class="loading"
            :me="me"
            :message="message"
            @mediaClick="$emit('mediaClick')"
          ></AttachmentIcon>
          <div class="bottom">
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
      </BadgeItem>
    </div>
  </div>
</template>
<script>
import spinner from '@/components/Spinner.vue'
import AttachmentIcon from '@/components/AttachmentIcon.vue'
import ICSending from '@/assets/images/ic_status_clock.svg'
import ICSend from '@/assets/images/ic_status_send.svg'
import ICRead from '@/assets/images/ic_status_read.svg'
import BadgeItem from './BadgeItem'
import { MessageStatus } from '@/utils/constants.js'
import { mapGetters } from 'vuex'
import { getNameColorById } from '@/utils/util.js'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
  components: {
    ICSending,
    ICSend,
    ICRead,
    BadgeItem,
    spinner,
    AttachmentIcon
  },
  data: function() {
    return {
      MessageStatus: MessageStatus
    }
  },
  methods: {
    messageOwnership: function() {
      let { message, me } = this
      return {
        send: message.userId === me.user_id,
        receive: message.userId !== me.user_id
      }
    },
    getColor: function(id) {
      return getNameColorById(id)
    },
    media: message => {
      if (message.mediaUrl === null || message.mediaUrl === undefined || message.mediaUrl === '') {
        return 'data:' + message.mediaMimeType + ';base64,' + message.thumbImage
      }
      return message.mediaUrl
    },
    borderSet: message => {
      if (1.5 * message.mediaWidth > message.mediaHeight) {
        return 'width-set'
      }
      if (3 * message.mediaWidth < message.mediaHeight) {
        return 'width-set'
      }
      return 'height-set'
    },

    borderSetObject: message => {
      if (1.5 * message.mediaWidth > message.mediaHeight) {
        return { width: message.mediaWidth + 'px' }
      }
      if (3 * message.mediaWidth < message.mediaHeight) {
        return { width: message.mediaWidth + 'px' }
      }
      return { height: message.mediaHeight + 'px' }
    }
  },
  computed: {
    loading: function() {
      return this.attachment.includes(this.message.messageId)
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
  .username {
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.2rem;
  }
  .content {
    display: flex;
    flex: 1;
    position: relative;
    flex-direction: column;
    text-align: start;
    overflow: hidden;
    .loading {
      width: 32px;
      height: 32px;
      left: 50%;
      top: 50%;
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 3;
    }
    .image {
      max-width: 10rem;
      max-height: 15rem;
      margin-left: 0.8rem;
      margin-right: 0.8rem;
      border-radius: 0.2rem;
      overflow: hidden;
      position: relative;
    }
    .bottom {
      display: flex;
      justify-content: flex-end;
      margin-right: 0.8rem;
      .time {
        color: #8799a5;
        display: flex;
        float: right;
        font-size: 0.75rem;
        bottom: 0.2rem;
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
.layout.send {
  flex-direction: row-reverse;
}
.layout.receive {
  flex-direction: row;
}
</style>
