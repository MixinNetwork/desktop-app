<template>
  <div>
    <div class="layout" :class="messageOwnership()">
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="transfer" @click="$emit('user-share-click')">
          <MessageItemIcon :url="message.assetIcon" />
          <div class="content bubble">
            <span class="amount">{{message.snapshotAmount}}</span>
            <div class="bottom">
              <span class="symbol">{{message.assetSymbol}}</span>
              <span class="time">{{message.lt}}</span>
            </div>
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script>
import MessageItemIcon from '@/components/MessageItemIcon'
import BadgeItem from './BadgeItem'

import { MessageStatus } from '@/utils/constants'
export default {
  props: ['conversation', 'message', 'me'],
  components: {
    MessageItemIcon,
    BadgeItem
  },
  data: function() {
    return {
      MessageStatus: MessageStatus
    }
  },
  methods: {
    messageOwnership() {
      return {
        send: this.message.userId === this.me.user_id,
        receive: this.message.userId !== this.me.user_id
      }
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
