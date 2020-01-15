<template>
  <div class="post-item layout" :class="messageOwnership()">
    <div class="item-title">
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
    </div>
    <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
      <div class="content">
        <div class="post" @click="preview">
          <VueMarkdown class="inner">{{message.content}}</VueMarkdown>
        </div>
        <div class="bottom">
          <TimeAndStatus :relative="true" :message="message" />
        </div>
      </div>
    </BadgeItem>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import {
  Getter
} from 'vuex-class'

import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import VueMarkdown from 'vue-markdown'
import { MessageStatus } from '@/utils/constants'
import { getNameColorById } from '@/utils/util'

@Component({
  components: {
    BadgeItem,
    TimeAndStatus,
    VueMarkdown
  }
})
export default class PostItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  @Getter('attachment') attachment: any

  $postViewer: any
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
  preview() {
    this.$postViewer.setPost(this.message.content)
    this.$postViewer.show()
  }
}
</script>
<style lang="scss" scoped>
.post-item {
  display: flex;
  margin-left: 0.8rem;
  margin-right: 0.8rem;
  flex-direction: column;
  cursor: pointer;
  .username {
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    min-width: 2rem;
    min-height: 0.85rem;
  }
  .item-title, .layout {
    max-width: 30rem;
    width: 100%;
    flex: 1;
  }
  .content {
    flex-direction: column;
    text-align: start;
    overflow: hidden;

    .post {
      box-sizing: border-box;
      max-height: 10rem;

      font-size: 0.75rem;
      border-radius: 0.2rem;
      background-color: white;
      padding: 1rem;
      .inner {
        height: 100%;
        max-height: 8.5rem;
        word-break: break-word;
        overflow: hidden;
      }
    }
    .bottom {
      display: flex;
      justify-content: flex-end;
    }
  }
  &.send {
    align-items: flex-end;
  }
}
</style>
