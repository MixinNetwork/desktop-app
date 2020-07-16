<template>
  <main class="chat container" @click="hideChoosePanel">
    <header v-if="conversation">
      <div>
        <Avatar
          style="font-size: 0.8rem"
          :conversation="conversation"
          @onAvatarClick="showDetails()"
        />
      </div>
      <div class="title">
        <div @click="showDetails()">
          <div class="username">{{name}}</div>
          <div class="identity number">{{identity}}</div>
        </div>
      </div>
      <div class="search" @click="chatSearch">
        <svg-icon icon-class="ic_search" />
      </div>
      <div class="attachment" @click="chooseAttachment">
        <input
          v-if="hasFileInput"
          type="file"
          style="display: none"
          ref="attachmentInput"
          @change="chooseAttachmentDone"
        />
        <svg-icon icon-class="ic_attach" />
      </div>
      <div class="bot" v-show="user && user.app_id!=null" @click="openUrl">
        <svg-icon icon-class="ic_bot" />
      </div>
      <ChatContainerMenu
        :conversation="conversation"
        @showDetails="showDetails()"
        @menuCallback="menuCallback"
      />
    </header>

    <ChatMessages
      :panelChoosing="panelChoosing"
      :panelHeight="panelHeight"
      :showScroll="showScroll"
      :changeConversation="changeConversation"
      :details="!!details"
      ref="chatMessages"
      @handle-item-click="$emit('handleItemClick')"
      @dragenter="onDragEnter"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    />

    <transition name="fade">
      <div
        class="floating mention"
        :class="{ 'box-message': boxMessage, 'is-bottom': isBottom }"
        v-if="conversation && currentMentionNum"
        @click="mentionClick"
      >
        <span class="badge" v-if="currentMentionNum">{{currentMentionNum}}</span>
        <span class="mention-icon">@</span>
      </div>
    </transition>

    <transition name="fade">
      <div
        class="floating"
        :class="{ 'box-message': boxMessage }"
        v-if="conversation && showScroll && !changeConversation && (!isBottom || !getLastMessage)"
        @click="goBottomClick"
      >
        <span class="badge" v-if="currentUnreadNum>0">{{currentUnreadNum}}</span>
        <svg-icon style="font-size: 1.4rem" icon-class="chevron-down" />
      </div>
    </transition>

    <audio
      id="mixinAudio"
      style="opacity: 0"
      @timeupdate="audioTimeupdate"
      @ended="audioEnded"
      :src="currentAudio && currentAudio.mediaUrl"
    ></audio>

    <div style="display: none" v-if="shadowCurrentVideo">
      <video-player
        ref="shadowVideoPlayer"
        @leavepictureinpicture="leavepictureinpicture"
        :options="shadowCurrentVideo.playerOptions"
      ></video-player>
    </div>

    <ChatInputBox
      ref="inputBox"
      v-show="conversation"
      :panelHeight="panelHeight"
      :participant="participant"
      :conversation="conversation"
      :boxMessage="boxMessage"
      @goBottom="goBottom"
      @clearBoxMessage="boxMessage=null"
      @panelChoosing="panelChooseAction"
      @panelHeightUpdate="panelHeightUpdate"
    />

    <MessageForward
      v-if="forwardMessage"
      :message="forwardMessage"
      @close="handleHideMessageForward"
    />

    <AddParticipant
      v-if="participantAdd"
      :participants="conversation.participants"
      @close="participantAdd=false"
      @done="participantAddDone"
    />

    <div class="empty" v-if="!conversation && startup">
      <span>
        <img src="../assets/empty.png" />
        <label id="title">{{$t('chat.keep_title')}}</label>
        <label>{{$t('chat.keep_des')}}</label>
      </span>
    </div>

    <transition name="slide-bottom">
      <FileContainer
        class="media"
        :style="(showTitlebar ? 'top: 1.4rem;' : '') + (dragging ? 'pointer-events: none;' : '')"
        v-if="(dragging && conversation) || file"
        :file="file"
        :dragging="dragging"
        :fileUnsupported="fileUnsupported"
        @close="closeFile"
        @sendFile="sendFile"
      ></FileContainer>
    </transition>

    <transition :name="changeConversation ? '' : 'slide-right'">
      <Details
        class="overlay"
        v-if="conversation"
        v-show="details"
        :changed="changeConversation"
        :details="details"
        @close="hideDetails"
        @send-message="detailSendMessage"
        @share="handleContactForward"
        @add-participant="participantAdd=true"
      ></Details>
    </transition>
    <transition :name="(searching.replace(/^key:/, '') || goSearchPos) ? '' : 'slide-right'">
      <ChatSearch
        class="overlay"
        v-if="conversation"
        v-show="searching"
        :show="!!searching"
        @close="hideSearch"
        @search="goSearchMessagePos"
      />
    </transition>

    <transition name="slide-right">
      <Editor
        class="overlay"
        v-show="editing"
        :conversation="conversation"
        :category="user.app_id ? 'PLAIN_POST' : 'SIGNAL_POST'"
      ></Editor>
    </transition>
  </main>
</template>

<script lang="ts">
import fs from 'fs'
import { Vue, Watch, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { MessageCategories, MessageStatus, PerPageMessageCount } from '@/utils/constants'
import { getVideoPlayerStatus, setVideoPlayerStatus } from '@/utils/util'
import { isImage, base64ToImage, AttachmentMessagePayload } from '@/utils/attachment_util'
import Dropdown from '@/components/menu/Dropdown.vue'
import Avatar from '@/components/Avatar.vue'
import ChatInputBox from '@/components/chat-container/ChatInputBox.vue'
import ChatContainerMenu from '@/components/chat-container/ChatContainerMenu.vue'
import Details from '@/components/chat-container/Details.vue'
import ChatSearch from '@/components/chat-container/ChatSearch.vue'
import ChatMessages from '@/components/chat-container/ChatMessages.vue'
import Editor from '@/components/chat-container/Editor.vue'
import FileContainer from '@/components/chat-container/FileContainer.vue'
import MessageForward from '@/components/chat-container/MessageForward.vue'
import AddParticipant from '@/components/chat-container/AddParticipant.vue'
import messageDao from '@/dao/message_dao'
import userDao from '@/dao/user_dao'
import browser from '@/utils/browser'
import appDao from '@/dao/app_dao'
import { remote } from 'electron'
let { BrowserWindow } = remote

@Component({
  components: {
    Avatar,
    Details,
    ChatInputBox,
    ChatContainerMenu,
    ChatSearch,
    ChatMessages,
    FileContainer,
    MessageForward,
    AddParticipant,
    Editor
  }
})
export default class ChatContainer extends Vue {
  @Watch('currentUnreadNum')
  onCurrentUnreadNumChanged(val: number, oldVal: number) {
    if (val === 0) {
      this.$refs.chatMessages.clearMessagePositionIndex(0)
    }
  }

  @Watch('conversation.conversationId')
  onConversationChanged(newVal: any, oldVal: any) {
    this.actionSetTempUnreadMessageId('')
    // clearTimeout(this.scrollStopTimer)
    // this.overflowMap = { top: false, bottom: false }
    // this.infiniteDownLock = false
    // this.infiniteUpLock = false
    this.file = null
    this.showMessages = false
    this.showScroll = false
    this.boxMessage = null
    this.getLastMessage = false
    // this.timeDivideShowForce = false
    // this.messageHeightMap = {}
    this.actionSetCurrentVideo(null)
    const mixinAudio: any = document.getElementById('mixinAudio')
    if (mixinAudio) {
      mixinAudio.pause()
    }
    this.hideChoosePanel()
    if (!this.conversation) {
      this.startup = true
      return
    }
    const { conversationId, unseenMessageCount } = this.conversation
    this.$refs.chatMessages.setConversationId(conversationId, unseenMessageCount - 1, true)
    if (conversationId) {
      this.startup = false
      this.details = null
      if (!this.searching.replace(/^key:/, '')) {
        this.actionSetSearching('')
      }

      this.changeConversation = true
      this.$nextTick(() => {
        if (this.$refs.inputBox) {
          this.$refs.inputBox.boxFocusAction()
        }
        this.$root.$emit('updateMenu', this.conversation)
      })
      if (unseenMessageCount) {
        this.actionMarkRead(conversationId)
      }
      setTimeout(() => {
        this.changeConversation = false
      }, 30)

      // const msgLen = this.messages.length
      // if (msgLen > 0 && msgLen < PerPageMessageCount) {
      //   this.showTopTips = true
      // } else {
      //   this.showTopTips = false
      // }
    }
  }

  @Watch('shadowCurrentVideo')
  onShadowCurrentVideoChanged(val: any) {
    if (val && !this.pictureInPictureInterval) {
      clearInterval(this.pictureInPictureInterval)
      this.pictureInPictureInterval = setInterval(() => {
        const player = this.$refs.shadowVideoPlayer.player
        if (player) {
          const { muted, paused, volume, currentTime, playbackRate } = val.playerOptions
          player
            .requestPictureInPicture()
            .then((data: any) => {
              if (data) {
                this.currentVideoPlayer = null
                clearInterval(this.pictureInPictureInterval)
                this.pictureInPictureInterval = null
                setVideoPlayerStatus(player, { muted, paused, volume, currentTime, playbackRate })
              }
            })
            .catch(() => {})
        }
      }, 30)
    }
  }

  @Getter('currentConversation') conversation: any
  @Getter('currentMessages') messages: any
  @Getter('searching') searching: any
  @Getter('currentUser') user: any
  @Getter('editing') editing: any
  @Getter('conversationUnseenMentionsMap') conversationUnseenMentionsMap: any
  @Getter('tempUnreadMessageId') tempUnreadMessageId: any
  @Getter('currentAudio') currentAudio: any
  @Getter('currentVideo') currentVideo: any
  @Getter('shadowCurrentVideo') shadowCurrentVideo: any

  @Action('markMentionRead') actionMarkMentionRead: any
  @Action('setSearching') actionSetSearching: any
  @Action('setCurrentVideo') actionSetCurrentVideo: any
  @Action('setShadowCurrentVideo') actionSetShadowCurrentVideo: any
  @Action('markRead') actionMarkRead: any
  @Action('sendAttachmentMessage') actionSendAttachmentMessage: any
  @Action('createUserConversation') actionCreateUserConversation: any
  @Action('recallMessage') actionRecallMessage: any
  @Action('setTempUnreadMessageId') actionSetTempUnreadMessageId: any

  $t: any
  $toast: any
  $refs: any
  $selectNes: any
  identity: any = ''
  participant: boolean = true
  details: any = null
  MessageStatus: any = MessageStatus
  dragging: boolean = false
  fileUnsupported: boolean = false
  file: any = null
  isBottom: any = true
  boxMessage: any = null
  forwardMessage: any = null
  shareContact: any = null
  currentUnreadNum: any = 0
  showMessages: any = true
  showScroll: any = true
  changeConversation: any = false
  panelChoosing: string = ''
  lastEnter: any = null
  goSearchPos: boolean = false
  getLastMessage: boolean = false
  startup: boolean = true
  hasFileInput: boolean = true

  participantAdd: boolean = false
  currentVideoPlayer: any = null
  pictureInPictureInterval: any = null

  get currentMentionNum() {
    if (!this.conversation) return
    const mentions = this.conversationUnseenMentionsMap[this.conversation.conversationId]
    if (mentions) {
      return mentions.length
    }
    return 0
  }

  get showTitlebar() {
    return process.platform === 'win32'
  }

  get name() {
    if (!this.conversation) return
    const { groupName, name } = this.conversation
    if (groupName) {
      return groupName
    }
    return name
  }

  mounted() {
    this.$root.$on('selectAllKeyDown', (event: any) => {
      const selectNes: any = document.getSelection()
      if (selectNes && selectNes.baseNode) {
        const { className } = selectNes.baseNode.parentNode
        if (!/(box|content)/.test(className) && this.editing) {
          return event.preventDefault()
        }
      }
    })

    Vue.prototype.$showUserDetail = (userId: string) => {
      let user = userDao.findUserById(userId)
      this.showDetails(user)
    }

    let windowsFocused = false
    setInterval(() => {
      if (!windowsFocused && this.conversation && BrowserWindow.getFocusedWindow()) {
        windowsFocused = true
        this.actionSetTempUnreadMessageId('')
        this.actionMarkRead(this.conversation.conversationId)
      }
      if (windowsFocused && !BrowserWindow.getFocusedWindow()) {
        windowsFocused = false
      }
    }, 1500)

    this.$root.$on('escKeydown', () => {
      this.hideDetails()
      this.hideSearch()
      this.closeFile()
      this.hideChoosePanel()
      this.boxMessage = null
      setTimeout(() => {
        if (this.$refs.inputBox) {
          this.$refs.inputBox.boxFocusAction()
        }
      }, 200)
    })
    let self = this
    document.onpaste = function(event: any) {
      if (!self.conversation) return
      event.preventDefault()
      const items = (event.clipboardData || event.originalEvent.clipboardData).items
      let blob: any = null
      let mimeType: any = null

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          mimeType = items[i].type
          blob = items[i].getAsFile()
          break
        }
      }
      if (blob !== null) {
        let reader: any = new FileReader()
        reader.onload = async function(event: any) {
          self.file = await base64ToImage(event.target.result, mimeType)
          reader = null
        }
        reader.readAsDataURL(blob)
        return
      }
      let text = (event.originalEvent || event).clipboardData.getData('text/plain')
      if (text) {
        document.execCommand('insertText', false, text)
      }
    }

    this.$root.$on('setCurrentVideoPlayer', (item: any, id: string) => {
      this.currentVideoPlayer = item
      if (id === this.currentVideo.message.messageId) {
        if (this.$refs.shadowVideoPlayer) {
          const shadowPlayer = this.$refs.shadowVideoPlayer.player
          const playerStatus = getVideoPlayerStatus(shadowPlayer)
          const isInPictureInPicture = shadowPlayer.isInPictureInPicture_
          if (isInPictureInPicture) {
            shadowPlayer.exitPictureInPicture().then((res: any) => {
              this.actionSetShadowCurrentVideo(null)
            })
          }
          this.currentVideoPlayer.requestPictureInPicture().then((data: any) => {
            if (data) {
              clearInterval(this.pictureInPictureInterval)
              this.pictureInPictureInterval = null
              setVideoPlayerStatus(this.currentVideoPlayer, playerStatus)
            }
          })
        }
      }
    })
  }

  beforeDestroy() {
    this.$root.$off('setCurrentVideoPlayer')
    this.$root.$off('selectAllKeyDown')
    this.$root.$off('escKeydown')
  }

  hideChoosePanel() {
    if (this.$refs.inputBox) {
      this.$refs.inputBox.hideChoosePanel()
    }
  }

  audioTimeupdate() {
    this.$root.$emit('audioTimeupdate')
  }

  audioEnded() {
    this.$root.$emit('audioEnded')
  }

  leavepictureinpicture() {
    this.actionSetShadowCurrentVideo(null)
  }

  participantAddDone(participants: any) {
    this.participantAdd = false
    const { conversationId } = this.conversation
    this.$store.dispatch('addParticipants', {
      participants,
      conversationId
    })
  }

  panelHeight: number = 12
  panelHeightUpdate(data: any) {
    this.panelHeight = data
  }

  panelChooseAction(data: any) {
    this.goBottom()
    if (data === 'stickerOpen') {
      this.panelHeightUpdate(12)
    }
    requestAnimationFrame(() => {
      this.panelChoosing = data
    })
  }

  chooseAttachment() {
    this.file = null
    this.$refs.attachmentInput.click()
  }
  chooseAttachmentDone(event: any) {
    this.file = event.target.files[0]
    this.hasFileInput = false
    setTimeout(() => {
      this.hasFileInput = true
    }, 10)
  }

  goSearchMessagePos(item: any, keyword: string) {
    this.$root.$emit('goSearchMessagePos', { item, keyword, goMessagePosType: 'search' })
  }

  detailSendMessage() {
    this.$refs.inputBox.boxFocusAction()
  }

  goBottom() {
    this.showScroll = false
    this.currentUnreadNum = 0
    this.$refs.chatMessages.goBottom()
    setTimeout(() => {
      this.showScroll = true
    }, 300)
  }

  goBottomClick() {
    this.$refs.chatMessages.refreshConversation(this.conversation.conversationId)
    setTimeout(() => {
      this.goBottom()
      this.$refs.inputBox.boxFocusAction(true)
    }, 100)
  }
  onDragEnter(e: any) {
    this.lastEnter = e.target
    e.preventDefault()
    this.dragging = true
  }
  onDragLeave(e: any) {
    if (this.lastEnter === e.target) {
      e.stopPropagation()
      e.preventDefault()
      this.dragging = false
    }
  }
  sendFile() {
    if (!this.file) return
    let size = this.file.size
    if (size / 1000 > 102400) {
      this.$toast(this.$t('chat.chat_file_invalid_size'))
    } else {
      let image = isImage(this.file.type)
      let category
      if (image) {
        category = this.user.app_id ? MessageCategories.PLAIN_IMAGE : MessageCategories.SIGNAL_IMAGE
      } else {
        category = this.user.app_id ? MessageCategories.PLAIN_DATA : MessageCategories.SIGNAL_DATA
      }
      let mimeType = this.file.type
      if (!mimeType) {
        mimeType = 'text/plain'
      }
      const payload: AttachmentMessagePayload = {
        mediaUrl: this.file.path,
        mediaMimeType: mimeType,
        category
      }
      const { conversationId } = this.conversation
      const message = {
        conversationId,
        payload,
        quoteId: ''
      }
      if (this.boxMessage) {
        message.quoteId = this.boxMessage.messageId
        this.boxMessage = null
      }
      this.$root.$emit('resetSearch')
      this.actionSendAttachmentMessage(message)
      this.goBottom()
    }
    this.closeFile()
  }
  onDragOver(e: any) {
    e.preventDefault()
  }
  onDrop(e: any) {
    this.fileUnsupported = false
    e.preventDefault()
    let fileList = e.dataTransfer.files
    if (fileList.length > 0) {
      this.file = fileList[0]
      try {
        fs.readFileSync(this.file.path)
      } catch (error) {
        this.fileUnsupported = true
      }
    }
    this.dragging = false
  }
  closeFile() {
    this.dragging = false
    this.file = null
  }
  showDetails(user: any) {
    if (!user) {
      user = this.user
      user.isCurrent = true
    }
    requestAnimationFrame(() => {
      this.details = user
    })
  }
  hideDetails() {
    this.details = null
    if (this.conversation) {
      this.$root.$emit('updateMenu', this.conversation)
    }
  }
  menuCallback(obj: any) {
    this.identity = obj.identity
    this.participant = obj.participant
  }
  chatSearch() {
    this.actionSetSearching('key:')
  }
  hideSearch() {
    this.actionSetSearching('')
  }
  openUrl() {
    let app = appDao.findAppByUserId(this.user.app_id)
    if (app) {
      browser.loadURL(app.home_uri, this.conversation.conversationId)
    }
  }
  handleItemClick({ type, message }: any) {
    switch (type) {
      case 'Reply':
        this.handleReply(message)
        break
      case 'Forward':
        this.handleForward(message)
        break
      case 'Remove':
        this.handleRemove(message)
        break
      case 'Recall':
        this.handleRecall(message)
        break
      default:
        break
    }
  }
  handleReply(message: any) {
    this.$refs.inputBox.boxFocusAction()
    this.boxMessage = message
  }
  handleForward(message: any) {
    this.forwardMessage = message
  }
  handleContactForward(contact: any) {
    const sharedUserId = contact.user_id
    const message = {
      content: btoa(`{"user_id":"${sharedUserId}"}`),
      curMessageType: 'contact',
      sharedUserId
    }
    this.forwardMessage = message
  }
  handleHideMessageForward() {
    this.forwardMessage = null
  }
  handleRemove(message: any) {
    if (!message) return
    this.$refs.chatMessages.deleteMessages([message.messageId])
  }
  handleRecall(message: any) {
    if (!message) return
    this.actionRecallMessage({
      messageId: message.messageId,
      conversationId: message.conversationId
    })
  }
}
</script>

<style lang="scss" scoped>
.chat.container {
  background: white url('../assets/overlay.png') no-repeat center;
  background-size: cover;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 0.8rem;

  header {
    box-shadow: 0 0.05rem 0.05rem #99999944;
    z-index: 10;
    padding: 0 0.8rem;
    display: flex;
    height: 2.9rem;
    box-sizing: border-box;
    align-items: center;
    background: $bg-color;
    .title {
      box-sizing: border-box;
      flex: 1;
      z-index: 1;
      text-align: left;
      cursor: pointer;
      max-width: calc(100% - 8rem);
      & > div {
        min-width: 8rem;
        max-width: calc(100% - 2rem);
        padding: 0 0.6rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        display: inline-flex;
      }
    }
    .bot,
    .search,
    .attachment {
      z-index: 1;
      width: 1.6rem;
      height: 1.6rem;
      margin-right: 0.2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .search {
      margin-right: 0.4rem;
    }
    .bot {
      font-size: 1rem;
    }
    .attachment {
      font-size: 0.8rem;
      margin-right: 0.3rem;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      input {
        position: absolute;
        opacity: 0;
        z-index: -1;
      }
    }
    .username {
      max-width: 100%;
      line-height: 1.4;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .identity.number {
      font-size: 0.6rem;
      color: $light-font-color;
      margin: 0.1rem 0 0;
    }
  }

  .empty {
    width: 100%;
    height: 100%;
    background: #f8f9fb;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    span {
      display: flex;
      flex-direction: column;
      align-items: center;
      label {
        max-width: 24rem;
        text-align: center;
        margin-top: 1.6rem;
        color: #93a0a7;
      }
      #title {
        font-size: 1.5rem;
        color: #505d64;
        font-weight: 300;
      }
      img {
        width: 12.8rem;
        height: 12.8rem;
      }
    }
  }
  .floating {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 1.4rem;
    width: 2rem;
    height: 2rem;
    background: #fafafa;
    right: 1rem;
    position: absolute;
    bottom: 3.6rem;
    box-shadow: 0 0.3rem 0.6rem rgba(0, 0, 0, 0.175);
    .badge {
      position: absolute;
      top: -0.35rem;
      background: $primary-color;
      border-radius: 1rem;
      box-sizing: border-box;
      color: #fff;
      font-size: 0.65rem;
      padding: 0.05rem 0.25rem;
    }

    &.box-message {
      margin-bottom: 2.4rem;
    }

    &.mention {
      bottom: 6.2rem;
      .mention-icon {
        font-size: 1.15rem;
        font-weight: 500;
      }
      &.is-bottom {
        bottom: 3.6rem;
        transition: bottom 0.3s ease;
      }
    }
  }

  .overlay {
    position: absolute;
    left: 14.4rem;
    right: 0;
    height: 100%;
    z-index: 10;
  }
  .overlay-reply {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    height: 100%;
    z-index: 10;
  }

  .media {
    position: absolute;
    top: 0;
    left: 14.4rem;
    right: 0;
    bottom: 0;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s;
  }
  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: all 0.3s ease;
  }
  .slide-right-enter,
  .slide-right-leave-to {
    transform: translateX(100%);
  }
  .slide-bottom-enter-active,
  .slide-bottom-leave-active {
    transition: all 0.3s ease;
  }
  .slide-bottom-enter,
  .slide-bottom-leave-to {
    transform: translateY(200%);
  }
  .slide-bottom-enter-active,
  .slide-bottom-leave-active {
    transition: all 0.3s ease;
  }
  .slide-bottom-enter,
  .slide-bottom-leave-to {
    transform: translateY(200%);
  }
}
</style>
