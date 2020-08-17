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
        v-show="mentionChoosing && contacts.length"
        :style="`padding-bottom: ${inputBoxHeight-36}px;`"
        :class="{ 'box-message': boxMessage }"
        :height="panelHeight"
        :contacts="contacts"
        :currentUid="currentUid"
        :mentions="mentions"
        :conversation="conversation"
        @choose="mentionClick"
      ></MentionPanel>
    </transition>

    <div class="notification-toast" v-if="showScamNotification">
      <svg-icon class="warning" icon-class="warning" />
      <span class="text">{{$t('scam_warning')}}</span>
      <svg-icon class="close" @click="closeScamNotification" icon-class="ic_close" />
    </div>

    <div v-if="conversation" class="box" @click.stop>
      <div
        v-if="showUnblock"
        class="unblock"
        @click="actionUnblock(user.user_id)"
      >{{$t('menu.chat.unblock')}}</div>
      <div v-else-if="!participant" class="removed">{{$t('home.removed')}}</div>
      <div v-show="participant && !showUnblock" class="input">
        <div class="sticker" @click.stop="chooseSticker">
          <svg-icon :icon-class="stickerChoosing ? 'ic_emoticon_on' : 'ic_emoticon'" />
        </div>
        <mixin-scrollbar style="margin-right: 0.15rem">
          <div class="ul editable" ref="boxWrap">
            <vue-tribute
              ref="tribute"
              :options="tributeOptions"
              @update="mentionUpdate"
              @select-index="mentionSelectIndex"
              @open="mentionToggle(true)"
              @close="mentionToggle(false)"
            >
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
            </vue-tribute>
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
import { MessageCategories, MessageStatus, ConversationCategory } from '@/utils/constants'
import conversationDao from '@/dao/conversation_dao'
import userDao from '@/dao/user_dao'
import participantDao from '@/dao/participant_dao'
import VueTribute from '@/components/mention'

import ReplyMessageContainer from '@/components/chat-container/ReplyMessageContainer.vue'
import MentionPanel from '@/components/chat-container/MentionPanel.vue'
import ChatSticker from '@/components/chat-container/ChatSticker.vue'

@Component({
  components: {
    ReplyMessageContainer,
    MentionPanel,
    ChatSticker,
    VueTribute
  }
})
export default class ChatItem extends Vue {
  @Prop(Number) readonly panelHeight: any
  @Prop(Boolean) readonly participant: any
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly boxMessage: any

  @Getter('currentUser') user: any
  // @Getter('me') me: any

  @Action('sendMessage') actionSendMessage: any
  @Action('sendStickerMessage') actionSendStickerMessage: any
  @Action('unblock') actionUnblock: any

  @Watch('stickerChoosing')
  onStickerChoosingChanged(val: string, oldVal: string) {
    this.$emit('panelChoosing', 'sticker' + (val ? 'Open' : 'Hide'))
  }

  @Watch('mentionChoosing')
  onMentionChoosingChanged(val: string, oldVal: string) {
    this.$emit('panelChoosing', 'mention' + (val ? 'Open' : 'Hide'))
  }

  @Watch('conversation.conversationId')
  onConversationChanged(newCid: any, oldCid: any) {
    this.hideChoosePanel()
    setTimeout(() => {
      this.updateContacts()
    }, 200)
  }

  mentions: any = {}
  participants: any = []
  contacts: any = []
  mentionChoosing: boolean = false
  stickerChoosing: boolean = false
  currentSelectMention: boolean = false
  currentUid: string = ''
  inputFlag: any = false
  boxFocus: boolean = false
  hideScamNotificationMap: any = {}
  tributeOptions: any = {
    values: []
  }

  get showUnblock() {
    return this.conversation.category === ConversationCategory.CONTACT && this.user.relationship === 'BLOCKING'
  }

  get showScamNotification() {
    const hideScamTime = this.hideScamNotificationMap[this.user.user_id] || 0
    return new Date().getTime() - hideScamTime > 24 * 3600000 && this.user.is_scam
  }

  mounted() {
    try {
      this.hideScamNotificationMap = JSON.parse(localStorage.hideScamNotificationMap || '{}')
    } catch (error) {}
  }

  updateContacts() {
    if (!this.conversation) return
    const { participants, category } = this.conversation
    const values: any = []
    if (category === 'GROUP') {
      participants.forEach((item: any) => {
        values.push({
          name: item.full_name,
          id: item.identity_number
        })
      })
    }
    this.tributeOptions.values = values
    this.participants = participants
    this.contacts = participants
  }

  mentionSelectIndex(index: any) {
    this.currentUid = this.contacts[index].identity_number
  }

  mentionUpdate(items: any) {
    const mentions: any = {}
    const uids: any = []
    items.forEach((item: any) => {
      mentions[item[2]] = item
      uids.push(item[2])
    })
    this.mentions = mentions
    this.contacts = this.participants.filter((item: any) => {
      return uids.indexOf(item.identity_number) > -1
    })
    const len = items.length
    let panelHeight = 12
    if (len < 4) {
      panelHeight = 3.3 * len
    }
    this.$emit('panelHeightUpdate', panelHeight)
  }

  mentionClick(index: any) {
    if (!event) {
      console.log('--mentionClick', event)
    }
    // @ts-ignore
    this.$refs.tribute.selectItem(index, event)
  }

  mentionToggle(flag: boolean) {
    this.mentionChoosing = flag
    setTimeout(() => {
      this.currentSelectMention = flag
    }, 10)
    if (flag) {
      if (this.contacts[0]) {
        this.currentUid = this.contacts[0].identity_number
      }
    }
  }

  closeScamNotification() {
    this.hideScamNotificationMap[this.user.user_id] = new Date().getTime()
    const mapStr = JSON.stringify(this.hideScamNotificationMap)
    localStorage.hideScamNotificationMap = mapStr
    this.hideScamNotificationMap = JSON.parse(mapStr)
  }

  onFocus() {
    this.boxFocus = true
  }

  onBlur() {
    this.boxFocus = false
  }

  boxFocusAction(keep?: boolean) {
    if (this.$refs.box) {
      requestAnimationFrame(() => {
        const $target: any = this.$refs.box
        if (!$target) return
        if (!keep) {
          $target.innerHTML = this.conversation && this.conversation.draft ? this.conversation.draft : ''
          const $wrap: any = this.$refs.boxWrap
          this.inputBoxHeight = $wrap.getBoundingClientRect().height
        }
        try {
          // @ts-ignore
          window.getSelection().collapse($target, 1)
          // @ts-ignore
          window.getSelection().collapse($target, $target.childNodes.length)
        } catch (error) {}
        $target.focus()
      })
    }
  }

  inputBoxHeight: number = 36
  saveMessageDraft() {
    const conversationId = this.conversation.conversationId
    const $target: any = this.$refs.box
    const $wrap: any = this.$refs.boxWrap
    this.inputBoxHeight = 36
    if ($target) {
      this.inputBoxHeight = $wrap.getBoundingClientRect().height
      const html = $target.innerHTML
      this.conversation.draft = html
      this.conversation.draftText = $target.innerText
      if (!$target.innerText.length) {
        this.hideChoosePanel()
        this.updateContacts()
      }
      if (this.conversation.draftText.length < 10) {
        this.inputBoxHeight = 36
      }
      conversationDao.updateConversationDraftById(conversationId, html)
    }
  }

  inputKeydown(event: any) {
    if (this.mentionChoosing && [38, 40].indexOf(event.keyCode) > -1) {
      event.preventDefault()
    }
  }

  sendMessage(event: any) {
    if (this.inputFlag === true || event.shiftKey) {
      return
    }
    if (this.currentSelectMention) {
      event.preventDefault()
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
    this.$emit('panelHeightUpdate', 12)
    requestAnimationFrame(() => {
      this.stickerChoosing = !this.stickerChoosing
    })
  }
  hideChoosePanel() {
    this.mentionChoosing = false
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
}
</script>
<style lang="scss" scoped>
.notification-toast {
  position: fixed;
  z-index: 10;
  font-size: 1rem;
  background: #fff;
  border-radius: 0.2rem;
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin: 0 0.8rem;
  bottom: 3rem;
  box-shadow: 0 0 0.1rem #99999944;
  right: 0;
  left: 14.3rem;
  .text {
    padding: 0 0.8rem;
    font-size: 0.75rem;
  }
  .warning {
    min-width: 1rem;
  }
  .close {
    margin-left: auto;
    min-width: 1rem;
    cursor: pointer;
  }
}
.box {
  font-size: 0.95rem;
  background: white;
  z-index: 1;
  position: relative;
  .removed {
    padding: 0.7rem 0.7rem;
    font-size: 0.7rem;
    text-align: center;
  }
  .unblock {
    padding: 0.7rem 0.7rem;
    font-size: 0.7rem;
    text-align: center;
    color: #3a7ee4;
    cursor: pointer;
  }
  .input {
    box-sizing: border-box;
    color: $light-font-color;
    display: flex;
    align-items: center;
    padding: 0.3rem 0.45rem;

    .sticker {
      margin: 0.1rem 0.2rem 0 0.2rem;
      cursor: pointer;
    }
    .send {
      cursor: pointer;
      margin: 0.05rem 0.1rem 0 0.2rem;
    }
  }
  .editable {
    max-height: 7.5rem;
    overflow-y: auto;
    flex-grow: 1;
    * {
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .box {
      padding: 0.35rem 0.15rem 0.35rem 0.45rem;
      margin-right: 0.5rem;
      font-size: 0.8rem;
      min-height: 1.1rem;
      line-height: 1.3;
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
    padding: 0 0.8rem 0 0;
  }
}

.slide-up-enter-active {
  transition: all 0.1s;
}
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter,
.slide-up-leave-to {
  transform: translateY(200%);
}
</style>
