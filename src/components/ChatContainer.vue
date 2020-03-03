<template>
  <main class="chat container" @click="hideChoosePanel">
    <header v-show="conversation">
      <div>
        <Avatar style="font-size: 1rem" :conversation="conversation" @onAvatarClick="showDetails" />
      </div>
      <div class="title">
        <div @click="showDetails">
          <div class="username">{{name}}</div>
          <div class="identity number">{{identity}}</div>
        </div>
      </div>
      <div class="search" @click="chatSearch">
        <svg-icon icon-class="ic_search" />
      </div>
      <div class="attachment" @click="chooseAttachment">
        <input type="file" v-if="!file" ref="attachmentInput" @change="chooseAttachmentDone" />
        <svg-icon icon-class="ic_attach" />
      </div>
      <div class="bot" v-if="user&&user.app_id!=null" @click="openUrl">
        <svg-icon icon-class="ic_bot" />
      </div>
      <ChatContainerMenu
        :conversation="conversation"
        @showDetails="showDetails"
        @menuCallback="menuCallback"
      />
    </header>

    <mixin-scrollbar
      :style="(panelHeight < 15 ? '' : 'transition: 0.3s all ease;') + (panelChoosing ? `margin-bottom: ${panelHeight}rem;` : '')"
      v-if="conversation"
      :goBottom="!showScroll"
    >
      <ul
        class="messages"
        ref="messagesUl"
        :style="showMessages ? '' : 'opacity: 0'"
        @dragenter="onDragEnter"
        @drop="onDrop"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @scroll="onScroll"
      >
        <li v-show="!user.app_id" :style="showTopTips ? '' : 'opacity:0'" class="encryption tips">
          <div class="bubble">{{$t('encryption')}}</div>
        </li>
        <TimeDivide
          ref="timeDivide"
          v-if="messagesVisible[0] && showMessages && timeDivideShow"
          :messageTime="contentUtil.renderTime(messagesVisible[0].createdAt)"
        />
        <MessageItem
          v-for="(item, index) in messagesVisible"
          :key="item.messageId"
          :message="item"
          :prev="messages[visibleFirstIndex + index - 1]"
          :unread="unreadMessageId"
          :conversation="conversation"
          :me="me"
          :searchKeyword="searchKeyword"
          v-intersect="onIntersect"
          @mention-visible="mentionVisibleUpdate"
          @user-click="onUserClick"
          @action-click="handleAction"
          @handle-item-click="handleItemClick"
        />
      </ul>
    </mixin-scrollbar>

    <transition name="fade">
      <div
        class="floating mention"
        :class="{ 'box-message': boxMessage, 'is-bottom': isBottom }"
        v-show="conversation && showMentionBottom"
        @click="mentionClick"
      >
        <span class="badge" v-if="showMentionBottom">{{currentMentionNum}}</span>
        <span class="mention-icon">@</span>
      </div>
    </transition>

    <transition name="fade">
      <div
        class="floating"
        :class="{ 'box-message': boxMessage }"
        v-show="conversation && !isBottom"
        @click="goBottomClick"
      >
        <span class="badge" v-if="currentUnreadNum>0">{{currentUnreadNum}}</span>
        <svg-icon style="font-size: 1.8rem" icon-class="chevron-down" />
      </div>
    </transition>

    <ChatInputBox
      ref="inputBox"
      v-if="conversation"
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
      :me="me"
      :message="forwardMessage"
      @close="handleHideMessageForward"
    />

    <div class="empty" v-if="!conversation">
      <span>
        <img src="../assets/empty.png" />
        <label id="title">{{$t('chat.keep_title')}}</label>
        <label>{{$t('chat.keep_des')}}</label>
      </span>
    </div>

    <transition name="slide-bottom">
      <FileContainer
        class="media"
        :style="dragging?'pointer-events: none;':''"
        v-show="(dragging&&conversation) || file"
        :file="file"
        :dragging="dragging"
        @close="closeFile"
        @sendFile="sendFile"
      ></FileContainer>
    </transition>

    <transition name="slide-right">
      <Details class="overlay" :userId="detailUserId" v-if="details" @close="hideDetails"></Details>
    </transition>
    <transition :name="(searching.replace(/^key:/, '') || goSearchPos) ? '' : 'slide-right'">
      <ChatSearch
        class="overlay"
        v-if="searching && conversation"
        @close="hideSearch"
        @search="goSearchMessagePos"
      />
    </transition>

    <transition name="slide-right">
      <Editor
        class="overlay"
        v-if="editing"
        :conversation="conversation"
        :category="user.app_id ? 'PLAIN_POST' : 'SIGNAL_POST'"
      ></Editor>
    </transition>
  </main>
</template>

<script lang="ts">
import { Vue, Watch, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { MessageCategories, MessageStatus } from '@/utils/constants'
import contentUtil from '@/utils/content_util'
import { isImage, base64ToImage, AttachmentMessagePayload } from '@/utils/attachment_util'
import Dropdown from '@/components/menu/Dropdown.vue'
import ChatInputBox from '@/components/ChatInputBox.vue'
import ChatContainerMenu from '@/components/ChatContainerMenu.vue'
import Avatar from '@/components/Avatar.vue'
import Details from '@/components/Details.vue'
import ChatSearch from '@/components/ChatSearch.vue'
import TimeDivide from '@/components/TimeDivide.vue'
import Editor from '@/components/Editor.vue'
import FileContainer from '@/components/FileContainer.vue'
import MessageItem from '@/components/MessageItem.vue'
import MessageForward from '@/components/MessageForward.vue'
import messageDao from '@/dao/message_dao'
import userDao from '@/dao/user_dao'
import messageBox from '@/store/message_box'
import browser from '@/utils/browser'
import appDao from '@/dao/app_dao'

@Component({
  components: {
    Avatar,
    Details,
    ChatInputBox,
    ChatContainerMenu,
    ChatSearch,
    TimeDivide,
    MessageItem,
    FileContainer,
    MessageForward,
    Editor
  }
})
export default class ChatContainer extends Vue {
  @Watch('currentUnreadNum')
  onCurrentUnreadNumChanged(val: number, oldVal: number) {
    if (val === 0) {
      messageBox.clearMessagePositionIndex(0)
    }
  }

  @Watch('messages.length')
  onMessagesLengthChanged(val: number, oldVal: number) {
    const ret = this.visibleIndexLimit(this.virtualDom)
    this.virtualDom = ret
    const messageIds: any = []
    this.messages.forEach(item => {
      messageIds.push(item.messageId)
    })
    this.messageIds = messageIds
    if (messageIds.length > this.threshold) {
      this.threshold = 200
    }
  }

  @Watch('virtualDom')
  onVirtualDomChanged(obj: any, oldObj: any) {
    this.getMessagesVisible(obj, oldObj)
  }

  @Watch('conversation')
  onConversationChanged(newC: any, oldC: any) {
    this.infiniteDownLock = true
    this.infiniteUpLock = false
    if ((oldC && newC && newC.conversationId !== oldC.conversationId) || (newC && !oldC)) {
      this.showMessages = false
      this.boxMessage = null
      this.goBottom(true)
      this.hideChoosePanel()
      this.$nextTick(() => {
        if (this.$refs.inputBox) {
          this.$refs.inputBox.boxFocusAction()
        }
      })
      this.$root.$emit('updateMenu', newC)
      this.beforeUnseenMessageCount = this.conversation.unseenMessageCount
      let markdownCount = 5
      for (let i = messageBox.messages.length - 1; i >= 0; i--) {
        const type = messageBox.messages[i].type
        if (type.endsWith('_POST') || type.endsWith('_IMAGE') || type.endsWith('_STICKER')) {
          const type = messageBox.messages[i].type
          messageBox.messages[i].fastLoad = true
          markdownCount--
        }
        if (markdownCount < 0) {
          break
        }
      }
      this.messages = messageBox.messages
      this.actionSetCurrentMessages(this.messages)
      if (newC) {
        let unreadMessage = messageDao.getUnreadMessage(newC.conversationId)
        if (unreadMessage) {
          this.unreadMessageId = unreadMessage.message_id
        } else {
          this.unreadMessageId = ''
        }
      }
      this.actionMarkRead(newC.conversationId)
    }
    if (newC && newC !== oldC) {
      if (newC.groupName) {
        this.name = newC.groupName
      } else if (newC.name) {
        this.name = newC.name
      }
      if (!oldC || newC.conversationId !== oldC.conversationId) {
        this.details = false
        if (!this.searching.replace(/^key:/, '')) {
          this.actionSetSearching('')
        }
        if (this.$refs.inputBox) {
          this.$refs.inputBox.boxFocusAction()
        }
        this.hideChoosePanel()
        this.file = null
      }
    }
  }

  @Getter('currentConversation') conversation: any
  @Getter('searching') searching: any
  @Getter('currentUser') user: any
  @Getter('me') me: any
  @Getter('editing') editing: any
  @Getter('conversationUnseenMentionsMap') conversationUnseenMentionsMap: any

  @Action('markMentionRead') actionMarkMentionRead: any
  @Action('sendMessage') actionSendMessage: any
  @Action('setSearching') actionSetSearching: any
  @Action('setCurrentMessages') actionSetCurrentMessages: any
  @Action('markRead') actionMarkRead: any
  @Action('sendAttachmentMessage') actionSendAttachmentMessage: any
  @Action('createUserConversation') actionCreateUserConversation: any
  @Action('recallMessage') actionRecallMessage: any

  $t: any
  $toast: any
  $refs: any
  $selectNes: any
  name: any = ''
  identity: any = ''
  participant: boolean = true
  details: any = false
  unreadMessageId: any = ''
  MessageStatus: any = MessageStatus
  dragging: any = false
  file: any = null
  messages: any[] = []
  isBottom: any = true
  boxMessage: any = null
  forwardMessage: any = null
  currentUnreadNum: any = 0
  beforeUnseenMessageCount: any = 0
  showMessages: any = true
  showScroll: any = true
  infiniteUpLock: any = false
  infiniteDownLock: any = true
  searchKeyword: any = ''
  timeDivideShow: boolean = false
  contentUtil: any = contentUtil
  panelChoosing: boolean = false
  lastEnter: any = null
  goSearchPos: boolean = false
  showTopTips: boolean = false

  goDown: boolean = false
  messagesVisible: any = []

  messageIds: any = []
  viewport: any = { firstIndex: 0, lastIndex: 0 }
  virtualDom: any = { firstIndex: 0, lastIndex: 0 }
  threshold: number = 600

  get currentMentionNum() {
    if (!this.conversation) return
    const mentions = this.conversationUnseenMentionsMap[this.conversation.conversationId]
    if (mentions) {
      return mentions.length
    }
    return 0
  }

  mounted() {
    this.$root.$on('escKeydown', () => {
      this.hideDetails()
      this.hideSearch()
      this.closeFile()
      this.hideChoosePanel()
      this.boxMessage = null
      setTimeout(() => {
        this.$refs.inputBox.boxFocusAction()
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
        let reader = new FileReader()
        reader.onload = async function(event: any) {
          self.file = await base64ToImage(event.target.result, mimeType)
        }
        reader.readAsDataURL(blob)
        return
      }
      let text = (event.originalEvent || event).clipboardData.getData('text/plain')
      if (text) {
        document.execCommand('insertText', false, text)
      }
    }
    messageBox.bindData(
      function(messages: any, unreadNum: any) {
        if (messages) {
          self.messages = messages
          self.getMessagesVisible(self.virtualDom, null)
        }
        if (unreadNum > 0 || unreadNum === 0) {
          self.currentUnreadNum = unreadNum
          setTimeout(() => {
            self.infiniteDownLock = false
          })
        }
      },
      function(force: any, message: any, clearUnreadMsgId: boolean) {
        if (clearUnreadMsgId) {
          self.unreadMessageId = ''
        }
        if (force) {
          if (!message) {
            self.goBottom()
          } else {
            self.goMessagePos(message)
          }
        } else if (self.isBottom) {
          self.goBottom()
        }
      }
    )
    this.$root.$on('goSearchMessagePos', (item: any) => {
      const { message, keyword } = item
      this.goSearchMessagePos(message, keyword)
    })
  }

  beforeDestroy() {
    this.$root.$off('goSearchMessagePos')
    this.$root.$off('escKeydown')
    this.$root.$off('mousemove')
  }

  hideChoosePanel() {
    if (this.$refs.inputBox) {
      this.$refs.inputBox.hideChoosePanel()
    }
  }

  panelHeight: number = 15
  panelHeightUpdate(data: any) {
    this.panelHeight = data
  }

  panelChooseAction(data: any) {
    this.goBottom()
    this.panelChoosing = /Open/.test(data)
  }

  visibleFirstIndex: number = 0
  getMessagesVisible(obj: any, oldObj: any) {
    const ret = this.visibleIndexLimit(obj)
    let { firstIndex, lastIndex } = ret

    this.visibleFirstIndex = firstIndex

    const { messages, messagesVisible } = this

    if (!messagesVisible.length) {
      this.messagesVisible = this.messages
    }

    const finalList = []
    for (let i = firstIndex; i <= lastIndex; i++) {
      const msg = this.messages[i]
      if (msg) {
        finalList.push(msg)
      }
    }
    this.messagesVisible = finalList
  }

  visibleIndexLimit(obj: any) {
    const { messages, threshold } = this
    const listLen = messages.length
    let { firstIndex, lastIndex } = obj

    if (lastIndex < threshold) {
      lastIndex = threshold - 1
    }
    if (lastIndex >= listLen) {
      lastIndex = listLen - 1
    }
    if (firstIndex >= lastIndex) {
      firstIndex = lastIndex - threshold
    }
    if (firstIndex <= 0) {
      firstIndex = 0
    }
    if (lastIndex <= 0) {
      lastIndex = 0
    }

    return {
      firstIndex,
      lastIndex
    }
  }

  onIntersect({ target, isIntersecting }: any) {
    const { messages, showScroll, threshold, messageIds, goDown } = this
    if (!messages || !showScroll) return

    const targetMessageId = target.id.substring(2, target.id.length)

    const index = messageIds.indexOf(targetMessageId)

    let { firstIndex, lastIndex } = this.virtualDom

    const offset = threshold
    if (isIntersecting) {
      if (goDown) {
        this.viewport.lastIndex = index
        if (index + offset >= lastIndex && targetMessageId !== messageIds[messageIds.length - 1]) {
          firstIndex += offset
          lastIndex += offset

          if (this.viewport.firstIndex < firstIndex) {
            firstIndex = this.viewport.firstIndex - offset
          }

          this.virtualDom = { firstIndex, lastIndex }
        }
      } else {
        this.viewport.firstIndex = index
        if (index - offset <= firstIndex && targetMessageId !== messageIds[0]) {
          firstIndex -= offset
          lastIndex -= offset

          if (this.viewport.lastIndex > lastIndex) {
            lastIndex = this.viewport.lastIndex + offset
          }

          this.virtualDom = { firstIndex, lastIndex }
        }
      }
    } else {
      if (goDown) {
        this.viewport.firstIndex = index
      } else {
        this.viewport.lastIndex = index
      }
    }
  }

  scrollStop() {
    this.scrollTimeout = null
  }

  beforeScrollTop: number = 0
  goDownBuffer: any = []
  scrollTimeout: any = null
  onScroll(e: any) {
    let list = this.$refs.messagesUl
    if (!list) return

    const goDown = this.beforeScrollTop < list.scrollTop
    this.goDownBuffer.unshift(goDown)
    this.goDownBuffer = this.goDownBuffer.splice(0, 3)
    if (this.goDownBuffer[0] !== undefined && this.goDownBuffer[0] === this.goDownBuffer[1]) {
      this.goDown = this.goDownBuffer[1]
    }
    this.beforeScrollTop = list.scrollTop

    this.isBottom = list.scrollHeight < list.scrollTop + list.clientHeight + 400
    if (this.isBottom) {
      this.infiniteDown()
    }
    const toTop = 200 + 20 * (list.scrollHeight / list.clientHeight)
    if (list.scrollTop < toTop) {
      this.infiniteUp()
    }
    clearTimeout(this.scrollTimeout)
    this.scrollTimeout = setTimeout(() => {
      if (list.scrollTop < toTop) {
        if (!this.infiniteUpLock) {
          list.scrollTop = toTop
        } else {
          this.showTopTips = true
        }
      }
      this.scrollStop()
    }, 100)

    if (!this.isBottom && list.scrollTop > 130) {
      this.timeDivideShow = true
    } else {
      this.timeDivideShow = false
    }
    setTimeout(() => {
      const timeDivide = this.$refs.timeDivide
      if (!timeDivide) return
      timeDivide.action()
    }, 10)
  }
  chooseAttachment() {
    this.file = null
    this.$refs.attachmentInput.click()
  }
  chooseAttachmentDone(event: any) {
    this.file = event.target.files[0]
  }

  goSearchMessagePos(item: any, keyword: string) {
    this.unreadMessageId = ''
    this.goSearchPos = true
    if (keyword) {
      this.showMessages = false
    }
    setTimeout(() => {
      this.hideSearch()
      const count = messageDao.ftsMessageCount(this.conversation.conversationId)
      const messageIndex = messageDao.ftsMessageIndex(
        this.conversation.conversationId,
        item.message_id || item.messageId
      )
      messageBox.setConversationId(this.conversation.conversationId, count - messageIndex - 1).then(() => {
        this.searchKeyword = keyword
        this.goSearchPos = false
      })
      this.$refs.inputBox.boxFocusAction()
    })
  }
  goMessagePosAction(posMessage: any, goDone: boolean, beforeScrollTop: number) {
    setTimeout(() => {
      this.infiniteDownLock = false
      let targetDom: any = document.querySelector('.unread-divide')
      let messageDom: any
      if (posMessage && posMessage.messageId && !targetDom) {
        messageDom = document.getElementById(`m-${posMessage.messageId}`)
        if (!this.searchKeyword && messageDom) {
          messageDom.className = 'notice'
        }
      }
      if (!targetDom && !messageDom) {
        return (this.showMessages = true)
      }
      let list = this.$refs.messagesUl
      if (!list) {
        return this.goMessagePosAction(posMessage, goDone, beforeScrollTop)
      }
      if (!goDone && beforeScrollTop !== list.scrollTop) {
        beforeScrollTop = list.scrollTop
        this.goMessagePosAction(posMessage, goDone, beforeScrollTop)
      } else {
        goDone = true
        if (messageDom) {
          if (list.scrollTop + list.clientHeight < messageDom.offsetTop || list.scrollTop > messageDom.offsetTop) {
            list.scrollTop = messageDom.offsetTop
          }
          setTimeout(() => {
            messageDom.className = ''
          }, 200)
        } else {
          list.scrollTop = targetDom.offsetTop
        }
        setTimeout(() => {
          this.showMessages = true
        })
      }
    })
  }
  goMessagePos(posMessage: any) {
    let goDone = false
    let beforeScrollTop = 0

    this.goMessagePosAction(posMessage, goDone, beforeScrollTop)
  }
  goBottom(wait?: boolean) {
    this.showScroll = false
    this.showTopTips = false

    const msgLen = this.messages.length
    this.virtualDom = { firstIndex: msgLen - this.threshold, lastIndex: msgLen - 1 }
    this.beforeUnseenMessageCount = 0

    setTimeout(() => {
      if (!wait) {
        this.showMessages = true
      }
      this.infiniteUpLock = false
      this.currentUnreadNum = 0
      let list = this.$refs.messagesUl
      if (!list) return
      let scrollHeight = list.scrollHeight
      list.scrollTop = scrollHeight
      this.searchKeyword = ''
      setTimeout(() => {
        this.showScroll = true
      }, 200)
    })
    messageBox.clearUnreadNum(0)
  }

  mentionVisibleIds: any = []
  mentionVisibleUpdate(payload: any) {
    const { messageId, isIntersecting } = payload
    const { conversationId } = this.conversation
    const mentions = this.conversationUnseenMentionsMap[conversationId]
    if (mentions && mentions.length > 0) {
      mentions.forEach((item: any) => {
        if (item.message_id === messageId) {
          if (isIntersecting) {
            this.mentionVisibleIds.push(messageId)
          } else {
            const index = this.mentionVisibleIds.indexOf(messageId)
            this.mentionVisibleIds.splice(index, 1)
          }
        }
        // TODO
        // this.actionMarkMentionRead({ conversationId, messageId })
      })
    }
  }

  get showMentionBottom() {
    return this.currentMentionNum > 0 && this.mentionVisibleIds.length === 0
  }

  mentionClick() {
    const { conversationId } = this.conversation
    const mentions = this.conversationUnseenMentionsMap[conversationId]
    if (mentions && mentions.length > 0) {
      const message = mentions[0]
      const messageId = message.message_id
      message.messageId = messageId
      this.unreadMessageId = ''
      this.goMessagePos(message)
      this.actionMarkMentionRead({ conversationId, messageId })
      this.$refs.inputBox.boxFocusAction(true)
    }
  }

  goBottomClick() {
    messageBox.refreshConversation(this.conversation.conversationId)
    setTimeout(() => {
      this.goBottom()
      this.$refs.inputBox.boxFocusAction(true)
    }, 100)
  }
  infiniteScroll(direction: any) {
    messageBox.nextPage(direction).then((messages: any) => {
      if (messages.length) {
        if (direction === 'down') {
          const newMessages = []
          const lastMessageId = this.messages[this.messages.length - 1].messageId
          for (let i = messages.length - 1; i >= 0; i--) {
            const temp = messages[i]
            if (temp.messageId === lastMessageId) {
              break
            }
            newMessages.unshift(temp)
          }
          this.messages.push(...newMessages)
          this.actionSetCurrentMessages(this.messages)
        } else {
          const newMessages = []
          const firstMessageId = this.messages[0].messageId
          for (let i = 0; i < messages.length; i++) {
            const temp = messages[i]
            if (temp.messageId === firstMessageId) {
              break
            }
            newMessages.push(temp)
          }
          this.messages.unshift(...newMessages)
          this.actionSetCurrentMessages(this.messages)
          this.infiniteUpLock = false
        }
      }
    })
  }
  infiniteUp() {
    if (this.infiniteUpLock) return
    this.infiniteUpLock = true
    this.infiniteScroll('up')
  }
  infiniteDown() {
    if (this.infiniteDownLock) return
    this.infiniteScroll('down')
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
        payload
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
    e.preventDefault()
    let fileList = e.dataTransfer.files
    if (fileList.length > 0) {
      this.file = fileList[0]
    }
    this.dragging = false
  }
  closeFile() {
    this.dragging = false
    this.file = null
  }
  detailUserId: string = ''
  showDetails(id?: string) {
    if (id) {
      this.detailUserId = id
    }
    this.details = true
  }
  hideDetails() {
    this.detailUserId = ''
    this.details = false
    if (this.conversation) {
      this.$root.$emit('updateMenu', this.conversation)
    }
  }
  menuCallback(obj: any) {
    this.identity = obj.identity
    this.participant = obj.participant
  }
  onUserClick(userId: any) {
    let user = userDao.findUserById(userId)
    this.actionCreateUserConversation({
      user
    })
  }
  handleAction(action: any) {
    if (action.startsWith('input:')) {
      const content = action.split('input:')[1]
      const msg = {
        conversationId: this.conversation.conversationId,
        content,
        category: 'PLAIN_TEXT',
        status: MessageStatus.SENDING
      }
      this.actionSendMessage({ msg })
      this.goBottom()
    } else if (action.startsWith('mention:')) {
      const id = action.split('mention:')[1]
      this.showDetails(id)
    } else {
      browser.loadURL(action)
    }
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
      browser.loadURL(app.home_uri)
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
  handleHideMessageForward() {
    this.forwardMessage = null
  }
  handleRemove(message: any) {
    if (!message) return
    messageBox.deleteMessages([message.messageId])
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
  height: 100vh;
  overflow: hidden;

  header {
    background: white;
    border-bottom: 1px solid $border-color;
    padding: 0rem 1rem;
    display: flex;
    height: 3.625rem;
    box-sizing: border-box;
    align-items: center;
    background: #ffffff;
    .title {
      box-sizing: border-box;
      flex: 1;
      z-index: 1;
      text-align: left;
      cursor: pointer;
      & > div {
        max-width: 12rem;
        padding: 0 0.8rem;
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
      width: 2rem;
      height: 2rem;
      margin-right: 0.3rem;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .search {
      margin-right: 0.5rem;
    }
    .bot {
      font-size: 1.25rem;
    }
    .attachment {
      font-size: 1.05rem;
      margin-right: 0.4rem;
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
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .identity.number {
      font-size: 0.75rem;
      color: $light-font-color;
      margin: 0.1rem 0 0;
    }
  }

  .messages {
    flex: 1;
    height: 100%;
    overflow-x: hidden;
    padding: 0.8rem;
    box-sizing: border-box;
  }

  .encryption.tips {
    text-align: center;
    .bubble {
      background: #fff7ad;
      border-radius: 0.5rem;
      display: inline-block;
      font-size: 0.875rem;
      padding: 0.3rem 0.8rem;
      margin-bottom: 0.8rem;
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
        max-width: 30rem;
        text-align: center;
        margin-top: 2rem;
        color: #93a0a7;
      }
      #title {
        font-size: 1.875rem;
        color: #505d64;
        font-weight: 300;
      }
      img {
        width: 16rem;
        height: 16rem;
      }
    }
  }
  .floating {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 1.75rem;
    width: 2.5rem;
    height: 2.5rem;
    background: #fafafa;
    right: 1.25rem;
    position: absolute;
    bottom: 4.5rem;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
    .badge {
      position: absolute;
      top: -0.375rem;
      background: #4b7ed2;
      border-radius: 1.25rem;
      box-sizing: border-box;
      color: #fff;
      font-size: 13px;
      padding: 1px 0.3125rem;
    }

    &.box-message {
      margin-bottom: 3rem;
    }

    &.mention {
      bottom: 7.75rem;
      .mention-icon {
        font-size: 1.45rem;
        font-weight: 500;
      }
      &.is-bottom {
        bottom: 4.5rem;
        transition: bottom 0.3s ease;
      }
    }
  }

  .overlay {
    position: absolute;
    left: 18rem;
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
    height: 100%;
    left: 18rem;
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
