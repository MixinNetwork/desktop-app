<template>
  <main class="chat container" @click="hideChoosePanel">
    <header v-show="conversation">
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
        <input type="file" v-show="!file" ref="attachmentInput" @change="chooseAttachmentDone" />
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

    <mixin-scrollbar
      :style="(panelHeight < 12 ? '' : 'transition: 0.3s all ease;')"
      v-if="conversation"
      :goBottom="!showScroll"
      @scroll="onScroll"
    >
      <TimeDivide
        ref="timeDivide"
        v-if="messagesVisible[0] && !onScrollLock"
        v-show="showMessages && timeDivideShow"
        :messageTime="contentUtil.renderTime(messagesVisible[0].createdAt)"
      />
      <ul
        class="messages"
        ref="messagesUl"
        :class="{ show: showMessages }"
        @dragenter="onDragEnter"
        @drop="onDrop"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
      >
        <div :style="`padding-top: ${virtualDom.top}px; padding-bottom: ${virtualDom.bottom}px;`">
          <div id="virtualTop"></div>
          <li v-show="!user.app_id" class="encryption tips">
            <div class="bubble">{{$t('encryption')}}</div>
          </li>
          <MessageItem
            v-for="(item, index) in messagesVisible"
            :key="item.messageId"
            :message="item"
            :prev="messages[visibleFirstIndex + index - 1]"
            :unread="unreadMessageId"
            :searchKeyword="searchKeyword"
            v-intersect="onIntersect"
            @loaded="onMessageLoaded"
            @mention-visible="mentionVisibleUpdate"
            @user-click="onUserClick"
            @action-click="handleAction"
            @handle-item-click="handleItemClick"
          />
          <div id="virtualBottom"></div>
        </div>
      </ul>
    </mixin-scrollbar>

    <transition name="fade">
      <div
        class="floating mention"
        :class="{ 'box-message': boxMessage, 'is-bottom': isBottom }"
        v-show="conversation && showMentionBottom"
        @click="mentionClick"
      >
        <span class="badge" v-show="showMentionBottom">{{currentMentionNum}}</span>
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
        <span class="badge" v-show="currentUnreadNum>0">{{currentUnreadNum}}</span>
        <svg-icon style="font-size: 1.4rem" icon-class="chevron-down" />
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
      <Details
        class="overlay"
        :userId="detailUserId"
        v-if="conversation"
        v-show="details"
        @close="hideDetails"
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

  @Watch('conversation')
  onConversationChanged(newC: any, oldC: any) {
    this.infiniteDownLock = true
    this.infiniteUpLock = false
    if ((oldC && newC && newC.conversationId !== oldC.conversationId) || (newC && !oldC)) {
      this.showMessages = false
      this.boxMessage = null
      this.mentionMarkReadLock = false
      this.onScrollLock = true
      this.messageHeightMap = {}
      this.virtualDom = {
        top: 0,
        bottom: 0
      }
      this.goBottom(true)
      this.hideChoosePanel()
      this.$nextTick(() => {
        if (this.$refs.inputBox) {
          this.$refs.inputBox.boxFocusAction()
        }
      })
      this.$root.$emit('updateMenu', newC)
      this.beforeUnseenMessageCount = this.conversation.unseenMessageCount
      this.actionSetCurrentMessages(messageBox.messages)
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

  @Watch('viewport')
  onViewportChanged(val: any, oldVal: any) {
    let { firstIndex, lastIndex } = val
    requestAnimationFrame(() => {
      const { messages, messageHeightMap } = this
      let top = 0
      let bottom = 0
      for (let i = lastIndex + 1; i < messages.length; i++) {
        if (messages[i]) {
          bottom += messageHeightMap[messages[i].messageId] || 0
        }
      }
      for (let i = 0; i < firstIndex; i++) {
        if (messages[i]) {
          top += messageHeightMap[messages[i].messageId] || 0
        }
      }
      this.virtualDom = {
        top,
        bottom
      }
    })
  }

  @Getter('currentConversation') conversation: any
  @Getter('searching') searching: any
  @Getter('currentUser') user: any
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

  scrollDirection: string = ''
  messageHeightMap: any = {}
  viewport: any = { firstIndex: 0, lastIndex: 0 }
  virtualDom: any = { top: 0, bottom: 0 }
  threshold: number = 60

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
  }

  hideChoosePanel() {
    if (this.$refs.inputBox) {
      this.$refs.inputBox.hideChoosePanel()
    }
  }

  panelHeight: number = 12
  panelHeightUpdate(data: any) {
    this.panelHeight = data
  }

  panelChooseAction(data: any) {
    this.goBottom()
    this.panelChoosing = /Open/.test(data)
  }

  onMessageLoaded(dom: any) {
    const { messageId, height } = dom
    this.messageHeightMap[messageId] = height
  }

  get messageIds() {
    const messageIds: any = []
    this.messages.forEach((msg: any) => {
      messageIds.push(msg.messageId)
    })
    return messageIds
  }

  visibleFirstIndex: number = 0
  get messagesVisible() {
    const list = []
    let { firstIndex, lastIndex } = this.viewport
    this.visibleFirstIndex = firstIndex
    if (firstIndex < 0) {
      firstIndex = 0
    }
    if (lastIndex < this.threshold) {
      lastIndex = this.threshold
    }
    for (let i = firstIndex; i < this.messages.length; i++) {
      list.push(this.messages[i])
      if (i >= lastIndex) {
        break
      }
    }
    if (this.intersectLock) {
      setTimeout(() => {
        this.intersectLock = false
      }, 200)
    }

    return list
  }

  viewportLimit(index: number, offset: number) {
    if (!offset) {
      offset = this.threshold
    }
    let firstIndex = index - offset
    let lastIndex = index + offset
    if (firstIndex < 0) {
      firstIndex = 0
      if (lastIndex < this.viewport.lastIndex) {
        lastIndex = this.viewport.lastIndex
      }
    }
    const cLen = this.messageIds.length
    if (lastIndex >= cLen) {
      lastIndex = cLen - 1
      if (firstIndex > this.viewport.firstIndex) {
        firstIndex = this.viewport.firstIndex
      }
    }
    return {
      firstIndex,
      lastIndex
    }
  }

  intersectLock: boolean = true
  onIntersect({ target, isIntersecting }: any) {
    if (this.intersectLock || !target.id) return
    const index = this.messageIds.indexOf(target.id.split('m-')[1])
    const direction = this.scrollDirection
    const offset = this.threshold
    const { firstIndex, lastIndex } = this.viewport
    if (
      (isIntersecting && direction === 'up' && index < firstIndex + offset / 2) ||
      (isIntersecting && direction === 'down' && index > lastIndex - offset / 2)
    ) {
      this.viewport = this.viewportLimit(index, offset)
    }
  }

  scrollStop() {
    this.scrollTimer = null
  }

  scrollTimer: any = null
  onScrollLock: boolean = true
  onScrollLockTimer: any = null
  onScroll(obj: any) {
    if (this.onScrollLock) {
      clearTimeout(this.onScrollLockTimer)
      this.onScrollLockTimer = setTimeout(() => {
        this.onScrollLock = false
      }, 300)
      return
    }
    if (obj) {
      this.scrollDirection = obj.direction
    }

    let list = this.$refs.messagesUl
    if (!list) return

    this.isBottom = list.scrollHeight < list.scrollTop + list.clientHeight + 400
    if (this.isBottom) {
      this.infiniteDown()
    }
    const toTop = 200 + 20 * (list.scrollHeight / list.clientHeight)
    if (list.scrollTop < toTop) {
      this.infiniteUp()
    }
    clearTimeout(this.scrollTimer)
    this.scrollTimer = setTimeout(() => {
      if (list.scrollTop < toTop) {
        if (!this.infiniteUpLock) {
          list.scrollTop = toTop
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
      requestAnimationFrame(() => {
        const timeDivide = this.$refs.timeDivide
        if (!timeDivide) return
        timeDivide.action()
      })
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
      messageBox.setConversationId(this.conversation.conversationId, count - messageIndex - 1)
      this.searchKeyword = keyword
      this.goSearchPos = false
      this.$refs.inputBox.boxFocusAction()
    })
  }
  goMessagePosAction(posMessage: any, goDone: boolean, beforeScrollTop: number) {
    requestAnimationFrame(() => {
      const posIndex = this.messageIds.indexOf(posMessage.messageId)
      this.viewport = this.viewportLimit(posIndex, 0)
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
        requestAnimationFrame(() => {
          this.showMessages = true
        })
        return
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
        requestAnimationFrame(() => {
          this.showMessages = true
        })
      }
    })
  }
  goMessagePos(posMessage: any) {
    let goDone = false
    let beforeScrollTop = 0

    setTimeout(() => {
      this.goMessagePosAction(posMessage, goDone, beforeScrollTop)
    }, 10)
  }
  goBottom(wait?: boolean) {
    this.showScroll = false

    const msgLen = this.messages.length
    this.viewport = this.viewportLimit(msgLen - 1, 0)
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

  mentionMarkReadLock: boolean = false
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
          if (!this.mentionMarkReadLock && isIntersecting) {
            this.actionMarkMentionRead({ conversationId, messageId })
          }
        }
      })
    }
    setTimeout(() => {
      if (this.isBottom && isIntersecting) {
        this.actionMarkMentionRead({ conversationId, messageId })
      }
      this.mentionMarkReadLock = true
    }, 200)
  }

  get showMentionBottom() {
    return this.mentionVisibleIds.length === 0 && this.currentMentionNum > 0
  }

  mentionClick() {
    this.mentionMarkReadLock = false
    const { conversationId } = this.conversation
    const mentions = this.conversationUnseenMentionsMap[conversationId]
    if (mentions && mentions.length > 0) {
      const message = mentions[0]
      const messageId = message.message_id
      message.messageId = messageId
      this.unreadMessageId = ''
      this.goMessagePos(message)
      // this.actionMarkMentionRead({ conversationId, messageId })
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
    const messages = messageBox.nextPage(direction)
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
        setTimeout(() => {
          this.infiniteDownLock = false
        }, 100)
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
        setTimeout(() => {
          this.infiniteUpLock = false
        }, 100)
      }
    }
  }
  infiniteUp() {
    if (this.infiniteUpLock) return
    this.infiniteUpLock = true
    this.infiniteScroll('up')
  }
  infiniteDown() {
    if (this.infiniteDownLock) return
    this.infiniteDownLock = true
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
  font-size: 0.8rem;

  header {
    background: white;
    border-bottom: 0.05rem solid $border-color;
    padding: 0 0.8rem;
    display: flex;
    height: 2.9rem;
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
        max-width: 9.5rem;
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

  .messages {
    contain: layout;
    flex: 1;
    height: 100%;
    overflow-x: hidden;
    padding: 0.6rem;
    box-sizing: border-box;
    opacity: 0;
    &.show {
      opacity: 1;
      & > li {
        contain: layout;
      }
    }
  }

  .encryption.tips {
    text-align: center;
    .bubble {
      background: #fff7ad;
      border-radius: 0.4rem;
      display: inline-block;
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      margin-bottom: 0.5rem;
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
      background: #4b7ed2;
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
    height: 100%;
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
