<template>
  <div>
    <div class="layout" :class="messageOwnership()">
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="transfer" @click="$emit('user-share-click')">
          <MessageItemIcon :url="content.icon_url" />
          <div class="content bubble">
            <span class="amount">{{content.amount}}</span>
            <div class="bottom">
              <span class="symbol">{{content.symbol}}</span>
              <span class="time">{{message.lt}}</span>
            </div>
          </div>
        </div>
      </BadgeItem>
    </div>
    <!-- <div class="bubble transfer">{{transferText(message)}}</div> -->
  </div>
</template>
<script>
import MessageItemIcon from '@/components/MessageItemIcon'
import assetDao from '@/dao/asset_dao'
import ICSending from '@/assets/images/ic_status_clock.svg'
import ICSend from '@/assets/images/ic_status_send.svg'
import ICRead from '@/assets/images/ic_status_read.svg'
import ICRobot from '@/assets/images/ic_robot.svg'
import BadgeItem from './BadgeItem'

import { MessageStatus } from '@/utils/constants'
import { getInfoByAssetId } from '@/utils/util'
export default {
  props: ['conversation', 'message', 'me'],
  components: {
    MessageItemIcon,
    ICSending,
    ICSend,
    ICRead,
    ICRobot,
    BadgeItem
  },
  data: function() {
    return {
      MessageStatus: MessageStatus
    }
  },
  methods: {
    transferText(message) {
      if (message.userId === this.me.user_id) {
        return this.$t('chat.chat_transfer_send')
      } else {
        return this.$t('chat.chat_transfer_receive')
      }
    },
    messageOwnership() {
      return {
        send: this.message.userId === this.me.user_id,
        receive: this.message.userId !== this.me.user_id
      }
    }
  },
  computed: {
    content() {
      const content = JSON.parse(this.message.content)
      const asset = assetDao.getAssetById(content.asset_id)
      Object.assign(content, asset[0])
      return content
    }
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  .transfer {
    padding: 12px;
    background: white;
    display: flex;
    flex-direction: row;
    align-content: center;
    min-width: 10rem;
    border-radius: 0.4rem;
    box-shadow: 0px 1px 1px #77777733;
    .content {
      display: flex;
      flex: 1;
      flex-direction: column;
      text-align: start;
      overflow: hidden;
      .bottom {
        display: flex;
        justify-content: space-between;
        .symbol {
          color: #888888cc;
          font-size: 0.8rem;
          margin-top: 6px;
          min-height: 1rem;
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
