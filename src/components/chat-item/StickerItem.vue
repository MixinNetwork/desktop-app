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
        <img :height="message.assetHeight < 96 ? message.assetHeight : 96" :src="message.assetUrl" />
      </BadgeItem>
      <TimeAndStatus :relative="true" style="padding-right: .4rem" :message="message" />
    </span>
  </span>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

import { MessageStatus } from '@/utils/constants'
import { getNameColorById } from '@/utils/util'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'

@Component({
  components: {
    BadgeItem,
    TimeAndStatus
  }
})
export default class StickerItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  MessageStatus: any = MessageStatus

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
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  .root {
    max-width: 18rem;
    display: flex;
    flex-direction: column;
    .username {
      display: inline-block;
      font-size: 0.85rem;
      max-width: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      margin-bottom: 0.2rem;
      margin-left: 0.4rem;
      min-width: 2rem;
      min-height: 0.85rem;
    }
    img {
      max-height: 6rem;
      border-radius: 0.3rem;
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
