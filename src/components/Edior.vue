<template>
  <div class="editor">
    <header class="title_bar">
      <div class="title_content">{{$t('editor_title')}}</div>
      <div class="title_send" @click="sendPost">
        <ICSend />
      </div>
    </header>
    <div class="content">
      <textarea class="textarea" v-model="post" ref="box" :placeholder="$t('editor_hold')"></textarea>
      <VueMarkdown class="markdown" :source="post"></VueMarkdown>
    </div>
  </div>
</template>
<script>
import VueMarkdown from 'vue-markdown'
import ICSend from '../assets/images/ic_send.svg'
import { MessageStatus } from '@/utils/constants.js'
export default {
  name: 'editor',
  props: ['conversation', 'category'],
  components: {
    ICSend,
    VueMarkdown
  },
  data() {
    return {
      post: ''
    }
  },
  methods: {
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
    padding: 0px 16px 0px 16px;
    flex-flow: row nowrap;
    line-height: 0;
    align-items: center;
    justify-content: space-between;
  }
  .content {
    display: flex;
    flex-flow: row nowrap;
    overflow: auto;
    flex: 1;
    .textarea {
      flex: 1 0 50%;
      display: block;
      font-size: 1rem;
      font-weight: 400;
      padding: 16px;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      border: 3px solid #cccccc;
      color: #333;
      border: none;
      outline: none;
    }

    .markdown {
      flex: 1 0 50%;
      display: block;
      background-color: #eeffef;
      border: none;
      width: 100%;
      height: 100%;
      font-size: 1rem;
      font-weight: 400;
      padding: 16px;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      outline: none;
    }
  }
}
</style>