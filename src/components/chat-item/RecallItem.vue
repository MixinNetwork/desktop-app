<template>
  <div class="layout" :class="messageOwnership()">
    <BadgeItem
      @handleMenuClick="$emit('handleMenuClick')"
      :type="message.type"
      :send="message.userId === me.user_id"
    >
      <div class="bubble">
        <span
          class="username"
          v-if="showName"
          :style="{color: getColor(message.userId)}"
          @click="$emit('user-click')"
        >{{message.userFullName}}</span>
        <div class="recall">
          <svg-icon style="margin-top: 0.12rem" icon-class="if_recall" />
          <I class="text">{{getContent}}</I>
          <span class="time-place"></span>
          <span class="time">{{message.lt}}</span>
        </div>
      </div>
    </BadgeItem>
  </div>
</template>
<script lang="ts">
import BadgeItem from './BadgeItem.vue'
import { getNameColorById } from '@/utils/util'
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component({
  components: {
    BadgeItem
  }
})
export default class RecallItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  $t: any

  get getContent() {
    let { message, me } = this
    if (message.userId === me.user_id) {
      return this.$t('chat.chat_recall_me')
    } else {
      return this.$t('chat.chat_recall_delete')
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
  .username {
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
}
.bubble {
  position: relative;
  display: inline-block;
  font-size: 0;
  max-width: 80%;
  border-radius: 0.15rem;
  text-align: left;
  word-break: break-all;
  user-select: text;
  font-size: 0.8rem;
  padding: 0.3rem 0.45rem;
  .text {
    margin-left: 0.2rem;
  }
  .time-place {
    float: right;
    margin-left: 0.45rem;
    width: 1.6rem;
    height: 0.8rem;
  }

  .time {
    color: #8799a5;
    display: flex;
    float: right;
    font-size: 0.6rem;
    position: absolute;
    bottom: 0.2rem;
    right: 0.15rem;
    align-items: flex-end;
  }
}
.layout.send {
  flex-direction: row-reverse;
  .bubble {
    margin-right: 0.6rem;
    background: #c5edff;
    &:after {
      content: '';
      border-top: 0.3rem solid transparent;
      border-left: 0.45rem solid #c5edff;
      border-bottom: 0.3rem solid transparent;
      width: 0;
      height: 0;
      position: absolute;
      right: -0.3rem;
      bottom: 0.2rem;
    }
  }
}
.layout.receive {
  flex-direction: row;
  .bubble {
    background: white;
    margin-left: 0.6rem;
    &:after {
      content: '';
      border-top: 0.3rem solid transparent;
      border-right: 0.45rem solid white;
      border-bottom: 0.3rem solid transparent;
      width: 0;
      height: 0;
      position: absolute;
      left: -0.3rem;
      bottom: 0.2rem;
    }
  }
}
</style>
