<template>
  <div class="post-item" :class="messageOwnership()">
    <div class="layout" :style="{maxWidth: `${maxWidth}px`}">
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
          <div class="markdown" :style="loaded ? {} : { minHeight }" @click="preview">
            <vue-markdown
              v-if="loaded"
              :anchorAttributes="{target: '_blank', rel: 'noopener noreferrer nofollow', onclick: 'linkClick(this.href)'}"
              class="inner"
            >{{content}}</vue-markdown>
          </div>
          <div class="bottom">
            <TimeAndStatus :relative="true" :message="message" />
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'

import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import { MessageStatus } from '@/utils/constants'
import { getNameColorById } from '@/utils/util'

@Component({
  components: {
    BadgeItem,
    TimeAndStatus
  }
})
export default class PostItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  @Getter('attachment') attachment: any

  loaded: boolean = false
  maxWidth: any = 480
  MessageStatus: any = MessageStatus
  $postViewer: any
  $selectNes: any
  minHeight: string = '2.4rem'
  content: string = ''

  mounted() {
    // @ts-ignore
    const chatWidth = document.querySelector('.chat.container').clientWidth
    if (chatWidth * 0.8 > this.maxWidth) {
      this.maxWidth = chatWidth * 0.8
    }
    const content = this.message.content.substr(0, 5000)
    let line = 0
    content.split('\n').forEach((piece: string) => {
      if (piece) {
        line++
      }
    })
    let minHeight = line * 1.2 + 3.6
    if (minHeight > 20) {
      minHeight = 20
    }
    this.minHeight = minHeight + 'rem'
    this.content = content
    if (this.message.fastLoad) {
      this.loaded = true
    } else {
      setTimeout(() => {
        this.loaded = true
      }, 200)
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
  preview() {
    if (this.$selectNes && this.$selectNes.baseOffset !== this.$selectNes.extentOffset) return
    this.$postViewer.setPost(this.message.content)
    this.$postViewer.show()
  }
}
</script>
<style lang="scss" scoped>
.post-item {
  display: flex;
  margin-left: 0.6rem;
  margin-right: 0.6rem;
  flex-direction: column;
  user-select: text;
  .username {
    display: inline-block;
    font-size: 0.65rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    min-width: 1.6rem;
    min-height: 0.65rem;
  }
  .item-title,
  .layout {
    width: 100%;
    flex: 1;
    .layout {
      display: flex;
      width: 100%;
    }
  }
  .content {
    flex-direction: column;
    text-align: start;
    overflow: hidden;
    cursor: pointer;
    width: 100%;

    .markdown {
      * {
        cursor: pointer;
      }
      box-sizing: border-box;
      border-radius: 0.15rem;
      background-color: white;
      padding: 0.6rem 0.8rem;
      .inner {
        height: 100%;
        max-height: 12.8rem;
        word-break: break-word;
        overflow: hidden;
      }
    }
    .bottom {
      padding: 0.12rem 0;
      display: flex;
      justify-content: flex-end;
    }
  }
  &.send {
    align-items: flex-end;
  }
}
</style>
