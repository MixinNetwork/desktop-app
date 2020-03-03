<template>
  <div>
    <ReplyMessageContainer
      v-if="boxMessage"
      :message="boxMessage"
      @hidenReplyBox="$emit('clearBoxMessage')"
    ></ReplyMessageContainer>

    <transition name="slide-up">
      <ChatSticker
        :style="`padding-bottom: ${inputBoxHeight-36}px`"
        :class="{ 'box-message': boxMessage }"
        :height="panelHeight"
        v-show="stickerChoosing"
        @send="sendSticker"
      ></ChatSticker>
    </transition>

    <transition name="slide-up">
      <MentionPanel
        v-show="mentionChoosing"
        :style="`padding-bottom: ${inputBoxHeight-36}px;` + (mentionHoverPrevent ? 'pointer-events: none;' : '')"
        :class="{ 'box-message': boxMessage }"
        :height="panelHeight"
        :keyword="mentionKeyword"
        :currentUid="currentSelectMention && currentSelectMention.identity_number"
        :mentions="mentions"
        :conversation="conversation"
        @currentSelect="udpateCurrentSelectMention"
        @choose="chooseMentionUser"
        @update="updateMentionUsers"
      ></MentionPanel>
    </transition>

    <div v-show="conversation" class="box" @click.stop>
      <div v-if="!participant" class="removed">{{$t('home.removed')}}</div>
      <div v-if="participant" class="input">
        <div class="sticker" @click.stop="chooseSticker">
          <svg-icon icon-class="ic_emoticon_on" v-if="stickerChoosing" />
          <svg-icon icon-class="ic_emoticon" v-else />
        </div>
        <mixin-scrollbar style="margin-right: .2rem">
          <div class="ul editable" ref="boxWrap">
            <div
              class="box"
              contenteditable="true"
              @focus="onFocus"
              @blur="onBlur"
              @input="saveMessageDraft"
              @keydown.enter="sendMessage"
              @keydown="inputKeydown"
              @compositionstart="inputFlag = true"
              @compositionend="inputFlag = false"
              ref="box"
            ></div>
          </div>
        </mixin-scrollbar>

        <div class="send" @click="sendMessage">
          <svg-icon icon-class="ic_send" />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component, Watch } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'

import contentUtil from '@/utils/content_util'
import { MessageCategories, MessageStatus } from '@/utils/constants'
import conversationDao from '@/dao/conversation_dao'
import userDao from '@/dao/user_dao'

import ReplyMessageContainer from '@/components/ReplyMessageContainer.vue'
import MentionPanel from '@/components/MentionPanel.vue'
import ChatSticker from '@/components/ChatSticker.vue'

@Component({
  components: {
    ReplyMessageContainer,
    MentionPanel,
    ChatSticker
  }
})
export default class ChatItem extends Vue {
  @Prop(Boolean) readonly participant: any
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly boxMessage: any

  @Getter('currentUser') user: any

  @Action('sendMessage') actionSendMessage: any
  @Action('sendStickerMessage') actionSendStickerMessage: any

  mentionChoosing: boolean = false
  stickerChoosing: boolean = false
  inputFlag: any = false
  boxFocus: boolean = false

  @Watch('stickerChoosing')
  onStickerChoosingChanged(val: string, oldVal: string) {
    this.$emit('panelChoosing', 'sticker' + (val ? 'Open' : 'Hide'))
  }

  @Watch('mentionChoosing')
  onMentionChoosingChanged(val: string, oldVal: string) {
    if (!val) {
      this.currentSelectMention = null
    }
    this.$emit('panelChoosing', 'mention' + (val ? 'Open' : 'Hide'))
  }

  @Watch('conversation')
  onConversationChanged(newC: any, oldC: any) {
    this.mentions = []
  }

  @Watch('panelHeight')
  onPanelHeightChanged(newC: any, oldC: any) {
    this.$emit('panelHeightUpdate', this.panelHeight)
  }

  onFocus() {
    this.boxFocus = true
  }

  onBlur() {
    this.boxFocus = false
  }

  mounted() {
    this.$root.$on('mousemove', () => {
      this.mentionHoverPrevent = false
    })
  }

  boxFocusAction(keep?: boolean) {
    if (this.$refs.box) {
      const $target: any = this.$refs.box
      if (!keep) {
        $target.innerHTML = this.conversation && this.conversation.draft ? this.conversation.draft : ''
        const $wrap: any = this.$refs.boxWrap
        this.inputBoxHeight = $wrap.getBoundingClientRect().height
        this.handleMention($target)
      }
      try {
        // @ts-ignore
        window.getSelection().collapse($target, 1)
        // @ts-ignore
        window.getSelection().collapse($target, $target.childNodes.length)
      } catch (error) {}
      setTimeout(() => {
        $target.focus()
      })
    }
  }

  inputBoxHeight: number = 36
  saveMessageDraft() {
    const conversationId = this.conversation.conversationId
    const $target: any = this.$refs.box
    const $wrap: any = this.$refs.boxWrap
    if ($target) {
      this.inputBoxHeight = $wrap.getBoundingClientRect().height
      const html = $target.innerHTML
      this.handleMention($target)
      this.conversation.draft = html
      this.conversation.draftText = $target.innerText
      conversationDao.updateConversationDraftById(conversationId, html)
    }
  }

  inputKeydown(event: any) {
    if (this.mentionChoosing && [38, 40].indexOf(event.keyCode) > -1) {
      event.preventDefault()
    }
  }

  sendMessage(event: any) {
    if (this.currentSelectMention) {
      this.chooseMentionUser(this.currentSelectMention)
      event.preventDefault()
      return
    }
    if (this.inputFlag === true || event.shiftKey) {
      return
    }
    event.preventDefault()
    const $target: any = this.$refs.box
    const text = contentUtil.messageFilteredText($target)
    if (text.trim().length <= 0) {
      return
    }
    this.hideChoosePanel()
    conversationDao.updateConversationDraftById(this.conversation.conversationId, '')
    $target.innerText = ''
    const category = this.user.app_id ? 'PLAIN_TEXT' : 'SIGNAL_TEXT'
    const status = MessageStatus.SENDING
    const message = {
      conversationId: this.conversation.conversationId,
      content: text.trim(),
      category: category,
      status: status
    }
    let msg: any = {
      quoteId: ''
    }
    if (this.boxMessage) {
      msg.quoteId = this.boxMessage.messageId
      this.$emit('clearBoxMessage')
    }
    msg.msg = message
    this.$root.$emit('resetSearch')
    this.actionSendMessage(msg)
    this.$emit('goBottom')
  }

  chooseSticker() {
    this.$emit('clearBoxMessage')
    this.mentionChoosing = false
    this.currentSelectMention = null
    this.panelHeight = 15
    setTimeout(() => {
      this.stickerChoosing = !this.stickerChoosing
    })
  }
  hideChoosePanel() {
    this.mentionKeyword = ''
    this.mentionChoosing = false
    this.currentSelectMention = null
    this.stickerChoosing = false
  }
  sendSticker(stickerId: string) {
    const { conversationId } = this.conversation
    const category = this.user.app_id ? 'PLAIN_STICKER' : 'SIGNAL_STICKER'
    const status = MessageStatus.SENDING
    const msg = {
      conversationId,
      stickerId,
      category,
      status
    }
    this.$root.$emit('resetSearch')
    this.actionSendStickerMessage(msg)
    this.$emit('goBottom')
  }

  mentions: string[] = []
  chooseMentionUser(user: any) {
    console.log('------chooseMentionUser')
    this.mentions.push(user)
    const $target: any = this.$refs.box
    let html = $target.innerHTML

    const regx = new RegExp(`<b class="highlight default">(.*?)</b>`, 'g')
    let idsTemp: any = []
    let idsArr
    while ((idsArr = regx.exec(html)) !== null) {
      idsTemp.push(idsArr[1])
    }

    const htmlPieces = html.split('&nbsp;')

    for (let i = htmlPieces.length - 1; i >= 0; i--) {
      let includes = false
      idsTemp.forEach((id: string) => {
        if (htmlPieces[i].includes(id)) {
          includes = true
        }
      })
      if (!includes) {
        const messageIds: any = []
        const innerPieces = htmlPieces[i].split(' ')
        for (let j = innerPieces.length - 1; j >= 0; j--) {
          this.mentions.forEach((item: any) => {
            const id = `@${item.identity_number}`
            if (messageIds.indexOf(id) < 0 && idsTemp.indexOf(id) < 0) {
              const hl = contentUtil.highlight(id, id, '')
              innerPieces[j] = innerPieces[j].replace(this.mentionKeyword, `${hl}<span>&nbsp;</span>`)
            }
            messageIds.push(id)
          })
        }
        htmlPieces[i] = innerPieces.join(' ')
      }
    }

    html = htmlPieces.join('&nbsp;')
    $target.innerHTML = html

    this.mentionChoosing = false
    this.mentionKeyword = ''
    this.currentSelectMention = null

    this.saveMessageDraft()
    this.boxFocusAction()
  }

  udpateCurrentSelectMention(mention: any) {
    this.currentSelectMention = mention
  }

  panelHeight: number = 15
  mentionHoverPrevent: boolean = false
  updateMentionUsers(result: any) {
    const len = result.length
    if (len) {
      if (len < 4) {
        this.panelHeight = 4.2 * len
      } else {
        this.panelHeight = 15
      }
      if (!this.mentionChoosing) {
        this.stickerChoosing = false
        this.mentionHoverPrevent = true
        this.mentionChoosing = true
      } else if (
        len === 1 &&
        (`@${result[0].identity_number}` === this.mentionKeyword || `@${result[0].full_name}` === this.mentionKeyword)
      ) {
        this.chooseMentionUser(result[0])
      }
    } else {
      const selection: any = window.getSelection()
      const currentNode: any = selection.anchorNode
      const parentNode = currentNode && currentNode.parentNode
      if (parentNode && /highlight/.test(parentNode.className)) {
        const content = currentNode.data
        const $target: any = this.$refs.box
        let html = $target.innerHTML
        const highlightRegx = new RegExp(`<b class="highlight default">${content.trim()}(.*)?</b>`, 'g')
        html = html.replace(highlightRegx, content)
        for (let i = 0; i < this.mentions.length; i++) {
          const item: any = this.mentions[i]
          if (`@${item.identity_number}` === content.trim()) {
            this.mentions.splice(i, 1)
          }
        }
        $target.innerHTML = html
        this.boxFocusAction(true)
      }
      this.currentSelectMention = null
      this.mentionChoosing = false
    }
  }

  splitSpace: string = ' '
  mentionKeyword: string = ''
  currentSelectMention: any = null
  handleMention(input: any) {
    let content = input.innerText.replace(/\s/g, this.splitSpace)

    const contentPieces = content.split(this.splitSpace)
    let lastPiece = ''
    let keyword = ''
    if (contentPieces.length) {
      lastPiece = contentPieces[contentPieces.length - 1]
    }
    if (/@(.*)?\S$/.test(lastPiece) || lastPiece === '@') {
      keyword = lastPiece
    }

    const numbers = contentUtil.parseMentionIdentityNumber(content)
    if (numbers.length > 0) {
      this.mentions = userDao.findUsersByIdentityNumber(numbers)
    }

    if (keyword) {
      this.mentionKeyword = keyword.trim()
      if (this.currentSelectMention && this.mentionKeyword === `@${this.currentSelectMention.identity_number}`) {
        this.chooseMentionUser(this.currentSelectMention)
      }
    } else {
      this.mentionChoosing = false
      this.currentSelectMention = null
      this.mentionKeyword = ''
      if (!input.innerText.trim()) {
        this.mentions = []
        try {
          // @ts-ignore
          window.getSelection().collapse(input, input.childNodes.length)
        } catch (error) {}
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.box {
  font-size: 1.2rem;
  background: white;
  z-index: 1;
  position: relative;
  .removed {
    padding: 0.9rem 0.9rem;
    font-size: 0.95rem;
    text-align: center;
  }
  .input {
    box-sizing: border-box;
    color: $light-font-color;
    display: flex;
    align-items: center;
    padding: 0.4rem 0.6rem;

    .sticker {
      margin: 0.15rem 0.25rem 0 0.25rem;
      cursor: pointer;
    }
    .send {
      cursor: pointer;
      margin: 0.1rem 0.15rem 0 0.25rem;
    }
  }
  .editable {
    max-height: 150px;
    overflow-y: auto;
    flex-grow: 1;
    * {
      word-break: break-all;
    }
    .box {
      padding: 0.45rem 0.6rem;
      font-size: 1rem;
      min-height: 1.4rem;
      line-height: 1.3rem;
      color: black;
      border: none;
      outline: none;
    }
    .box[placeholder]:empty:before {
      content: attr(placeholder);
      color: #555;
    }

    .box[placeholder]:empty:focus:before {
      content: '';
    }
  }
  .bot {
    padding: 0 1rem 0 0;
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter,
.slide-up-leave-to {
  transform: translateY(200%);
}
</style>
