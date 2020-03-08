<template>
  <div>
    <div class="layout" :class="messageOwnership()">
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="transfer" @click="$emit('user-share-click')">
          <MessageItemIcon :url="message.assetIcon" />
          <div class="content">
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
<script lang="ts">
import MessageItemIcon from '@/components/MessageItemIcon.vue'
import BadgeItem from './BadgeItem.vue'

import { MessageStatus } from '@/utils/constants'
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component({
  components: {
    MessageItemIcon,
    BadgeItem
  }
})
export default class TransferItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any

  MessageStatus: any = MessageStatus

  messageOwnership() {
    return {
      send: this.message.userId === this.me.user_id,
      receive: this.message.userId !== this.me.user_id
    }
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  .transfer {
    padding: 0.6rem;
    background: white;
    display: flex;
    flex-direction: row;
    align-content: center;
    min-width: 8rem;
    border-radius: 0.3rem;
    box-shadow: 0 0.05rem 0.05rem #77777733;
    .content {
      display: flex;
      flex: 1;
      flex-direction: column;
      text-align: start;
      overflow: hidden;
      .amount {
        font-size: 0.95rem;
      }
      .bottom {
        display: flex;
        justify-content: space-between;
        .symbol {
          color: #888888cc;
          font-size: 0.6rem;
          line-height: 1.5;
          min-height: 0.8rem;
        }
        .time {
          user-select: none;
          position: absolute;
          color: #8799a5;
          display: flex;
          float: right;
          font-size: 0.6rem;
          bottom: 0.2rem;
          right: 0.15rem;
          align-items: flex-end;
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
