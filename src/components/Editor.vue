<template>
  <div class="editor">
    <header class="title_bar">
      <div @click="closeEditor">
        <ICClose />
      </div>
      <div class="title_content">{{$t('editor_title')}}</div>
      <div class="title_send" @click="sendPost">
        <ICSend />
      </div>
    </header>
    <div class="content">
      <mixin-scrollbar>
        <textarea class="textarea ul" v-model="post" ref="box" :placeholder="$t('editor_hold')"></textarea>
      </mixin-scrollbar>
      <mixin-scrollbar>
        <VueMarkdown class="markdown ul" :source="post"></VueMarkdown>
      </mixin-scrollbar>
    </div>
  </div>
</template>
<script>
import VueMarkdown from 'vue-markdown'
import ICSend from '../assets/images/ic_send.svg'
import ICClose from '@/assets/images/ic_close.svg'
import { MessageStatus } from '@/utils/constants'
export default {
  name: 'editor',
  props: ['conversation', 'category'],
  components: {
    ICSend,
    ICClose,
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
    },
    closeEditor() {
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
    .title_content {
      flex: 1;
      font-weight: 500;
      margin-left: 1rem;
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
      word-break: break-word;
      background-color: #eeffef;
      border: none;
      padding: 1rem;
      line-height: 1.5;
      width: 100%;
      height: 100%;
      font-size: 1rem;
      font-weight: 400;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      outline: none;
      p {
        margin: 0 0 1rem;
      }
    }
  }
}
</style>