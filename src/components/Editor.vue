<template>
  <div class="editor">
    <header class="title_bar">
      <div @click="closeEditor">
        <svg-icon style="font-size: 1.5rem" icon-class="ic_close" />
      </div>
      <div class="title_content">{{$t('editor_title')}}</div>
      <div class="title_send" @click="sendPost">
        <svg-icon icon-class="ic_send" />
      </div>
    </header>
    <div class="content">
      <mixin-scrollbar>
        <textarea class="textarea ul" v-model="post" ref="box" :placeholder="$t('editor_hold')"></textarea>
      </mixin-scrollbar>
      <mixin-scrollbar>
        <vue-markdown
          :anchorAttributes="{rel: 'nofollow', onclick: 'linkClick(this.href)'}"
          class="markdown ul"
          :source="post"
        ></vue-markdown>
      </mixin-scrollbar>
    </div>
  </div>
</template>
<script lang="ts">
import { MessageStatus } from '@/utils/constants'

import { Vue, Prop, Component } from 'vue-property-decorator'

@Component
export default class Editor extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(String) readonly category: any

  post: any = ''

  mounted() {
    setTimeout(() => {
      // @ts-ignore
      this.$refs.box.focus()
    }, 100)
  }

  sendPost() {
    let { conversation, category } = this
    const message = {
      msg: {
        conversationId: conversation.conversationId,
        content: this.post,
        category: category,
        status: MessageStatus.SENDING
      }
    }
    this.$store.dispatch('sendMessage', message)
    this.$store.dispatch('toggleEditor')
  }
  closeEditor() {
    this.$store.dispatch('toggleEditor')
  }
}
</script>
<style lang="scss">
.editor {
  background: #f5f7fa;
  display: flex;
  flex-flow: column nowrap;
  .title_bar {
    height: 3.6rem;
    display: flex;
    padding: 0px 1rem 0px 1rem;
    flex-flow: row nowrap;
    line-height: 0;
    align-items: center;
    .title_content {
      flex: 1;
      font-weight: 500;
      margin-left: 1rem;
    }
    .title_send {
      font-size: 1.2rem;
    }
  }
  .content {
    display: flex;
    flex-flow: row nowrap;
    overflow: auto;
    flex: 1;
    .textarea {
      flex: 1;
      display: block;
      font-size: 1rem;
      font-weight: 400;
      line-height: 1.5;
      padding: 1rem;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      border: 3px solid #cccccc;
      color: #333;
      border: none;
      outline: none;
      resize: none;
    }

    .markdown {
      flex: 1;
      display: block;
      background-color: #eeffef;
      border: none;
      padding: 1rem;
      width: 100%;
      height: 100%;
    }
  }
}
</style>