<template>
  <main class="chat container" @click="hideChoosePanel">
    <header v-if="conversation">
      <div>
        <Avatar
          style="font-size: 0.8rem"
          :conversation="conversation"
          @onAvatarClick="showDetails('')"
        />
      </div>
      <div class="title">
        <div @click="showDetails('')">
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
        @showDetails="showDetails('')"
        @menuCallback="menuCallback"
      />
    </header>

    <mixin-scrollbar
      :style="(panelChoosing === 'stickerOpen' ? 'transition: 0.1s all;' : 'transition: 0.3s all ease;') + (panelChoosing === 'stickerOpen' ? `margin-bottom: ${panelHeight}rem;` : '')"
      v-if="conversation"
      :goBottom="!showScroll"
      @scroll="onScroll"
    >
      <TimeDivide
        ref="timeDivide"
        v-if="messagesVisible[0] && timeDivideShowForce && !details"
        v-show="showMessages && timeDivideShow"
        :messageTime="contentUtil.renderTime(messagesVisible[0].createdAt)"
      />
      <ul
        class="messages"
        ref="messagesUl"
        :class="{ show: showMessages, 'hide-time-divide': hideTimeDivide }"
        @dragenter="onDragEnter"
        @drop="onDrop"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
      >
        <div v-intersect="onIntersect" :style="`height: ${virtualDom.top}px`" id="virtualTop"></div>
        <li v-show="!user.app_id" :style="{opacity: showTopTips ? 1 : 0}" class="encryption tips">
          <div class="bubble">{{$t('encryption')}}</div>
        </li>
        <MessageItem
          v-for="(item, index) in messagesVisible"
          :key="item.messageId"
          :message="item"
          :prev="messagesVisible[index - 1]"
          :unread="unreadMessageId"
          :searchKeyword="searchKeyword"
          v-intersect="onIntersect"
          @loaded="onMessageLoaded"
          @mention-visible="mentionVisibleUpdate"
          @user-click="onUserClick"
          @action-click="handleAction"
          @handle-item-click="handleItemClick"
        />
        <div v-intersect="onIntersect" :style="`height: ${virtualDom.bottom}px`" id="virtualBottom"></div>
      </ul>
    </mixin-scrollbar>

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
        v-if="conversation && (!isBottom || !getLastMessage)"
        @click="goBottomClick"
      >
        <span class="badge" v-if="currentUnreadNum>0">{{currentUnreadNum}}</span>
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

    <transition name="slide-right">
      <Details
        class="overlay"
        :userId="detailUserId"
        v-if="conversation"
        v-show="details"
        :details="details"
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
import fs from 'fs'
import { Vue, Watch, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { MessageCategories, MessageStatus, PerPageMessageCount } from '@/utils/constants'
import contentUtil from '@/utils/content_util'
// @ts-ignore
import _ from 'lodash'
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

  conversationChangedTimer: any = null
  @Watch('conversation.conversationId')
  onConversationChanged(newVal: any, oldVal: any) {
    clearTimeout(this.scrollStopTimer)
    this.overflowMap = { top: false, bottom: false }
    this.infiniteDownLock = false
    this.infiniteUpLock = false
    this.file = null
    this.showMessages = false
    this.boxMessage = null
    this.scrollTimerThrottle = null
    this.showTopTips = false
    this.hideTimeDivide = false
    this.timeDivideShowForce = false
    this.messageHeightMap = {}
    if (!this.conversation) return
    const { groupName, name, conversationId } = this.conversation
    if (newVal) {
      this.startup = false
      this.details = false
      if (!this.searching.replace(/^key:/, '')) {
        this.actionSetSearching('')
      }
      if (groupName) {
        this.name = groupName
      } else if (name) {
        this.name = name
      }
      this.hideChoosePanel()

      this.beforeUnseenMessageCount = this.conversation.unseenMessageCount
      this.changeConversation = true
      this.$nextTick(() => {
        if (this.$refs.inputBox) {
          this.$refs.inputBox.boxFocusAction()
        }
        this.$root.$emit('updateMenu', this.conversation)
        clearTimeout(this.conversationChangedTimer)
        this.conversationChangedTimer = setTimeout(() => {
          this.changeConversation = false
          this.actionMarkRead(conversationId)
        }, 50)
      })
      const msgLen = this.messages.length
      if (msgLen > 0 && msgLen < PerPageMessageCount) {
        this.showTopTips = true
      }
    }
  }

  @Watch('messages.length')
  onMessagesLengthChanged(val: number) {
    if (this.changeConversation) return
    if (val > 0 && val < PerPageMessageCount) {
      this.showTopTips = true
    }
    this.messagesVisible = this.getMessagesVisible()
    if (this.isBottom && this.conversation) {
      const lastMessage = this.messages[this.messages.length - 1]
      if (lastMessage === this.messagesVisible[this.messagesVisible.length - 1]) {
        this.actionMarkMentionRead({
          conversationId: this.conversation.conversationId,
          messageId: lastMessage.messageId
        })
      }
    }
  }

  @Watch('viewport')
  onViewportChanged(val: any, oldVal: any) {
    let { firstIndex, lastIndex } = val
    const bfv = this.beforeViewport
    if (bfv.firstIndex === firstIndex && bfv.lastIndex === lastIndex) {
      return
    }

    this.beforeViewport = { firstIndex, lastIndex }
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

    this.messagesVisible = this.getMessagesVisible()
    this.virtualDom = {
      top,
      bottom
    }
  }

  @Getter('currentConversation') conversation: any
  @Getter('currentMessages') messages: any
  @Getter('searching') searching: any
  @Getter('currentUser') user: any
  @Getter('editing') editing: any
  @Getter('conversationUnseenMentionsMap') conversationUnseenMentionsMap: any

  @Action('markMentionRead') actionMarkMentionRead: any
  @Action('sendMessage') actionSendMessage: any
  @Action('setSearching') actionSetSearching: any
  @Action('markRead') actionMarkRead: any
  @Action('sendAttachmentMessage') actionSendAttachmentMessage: any
  @Action('createUserConversation') actionCreateUserConversation: any
  @Action('recallMessage') actionRecallMessage: any

  $t: any
  $toast: any
  $goConversationPos: any
  $refs: any
  $selectNes: any
  name: any = ''
  identity: any = ''
  participant: boolean = true
  details: any = false
  unreadMessageId: any = ''
  MessageStatus: any = MessageStatus
  dragging: boolean = false
  fileUnsupported: boolean = false
  file: any = null
  isBottom: any = true
  boxMessage: any = null
  forwardMessage: any = null
  currentUnreadNum: any = 0
  beforeUnseenMessageCount: any = 0
  showMessages: any = true
  showScroll: any = true
  infiniteUpLock: any = false
  infiniteDownLock: any = false
  changeConversation: any = false
  searchKeyword: any = ''
  timeDivideShowForce: boolean = false
  timeDivideShow: boolean = false
  contentUtil: any = contentUtil
  panelChoosing: string = ''
  lastEnter: any = null
  goSearchPos: boolean = false
  getLastMessage: boolean = false
  startup: boolean = true

  scrollDirection: string = ''
  messageHeightMap: any = {}
  viewport: any = { firstIndex: 0, lastIndex: 0 }
  beforeViewport: any = { firstIndex: 0, lastIndex: 0 }
  virtualDom: any = { top: 0, bottom: 0 }
  threshold: number = 30
  showTopTips: boolean = false
  hideTimeDivide: boolean = false

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

  hideTimeDivideTimer: any = null
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
      function(payload: any) {
        const { messages, unreadNum, infiniteUpLock, infiniteDownLock, getLastMessage } = payload
        if (unreadNum > 0 || unreadNum === 0) {
          self.currentUnreadNum = unreadNum
          setTimeout(() => {
            self.infiniteDownLock = false
          })
        }
        if (messages) {
          const { firstIndex, lastIndex } = self.viewport
          self.viewport = self.viewportLimit(firstIndex - self.threshold, lastIndex + self.threshold)
          self.udpateMessagesVisible()
        } else if (getLastMessage) {
          self.getLastMessage = getLastMessage
        }
        self.infiniteUpLock = infiniteUpLock
        self.infiniteDownLock = infiniteDownLock
        clearTimeout(self.hideTimeDivideTimer)
        self.hideTimeDivideTimer = setTimeout(() => {
          self.hideTimeDivide = false
        }, 300)
      },
      function(payload: any) {
        const { message, isMyMsg, isInit, goBottom }: any = payload
        if (message) {
          if (isInit) {
            self.unreadMessageId = message.messageId
          }
          self.goMessagePos(message)
        } else if (isMyMsg || goBottom || self.isBottom) {
          self.unreadMessageId = ''
          self.goBottom(goBottom)
        }
      }
    )
    this.$root.$on('goSearchMessagePos', (item: any) => {
      const { message, keyword, goMessagePosType } = item
      this.goMessagePosType = goMessagePosType
      this.goSearchMessagePos(message, keyword)
    })
  }

  beforeDestroy() {
    this.$root.$off('goSearchMessagePos')
    this.$root.$off('selectAllKeyDown')
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
    requestAnimationFrame(() => {
      this.panelChoosing = data
    })
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

  messagesVisible: any = []
  getMessagesVisible() {
    const list = []
    let { firstIndex, lastIndex } = this.viewport
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
    return _.sortBy(list, ['createdAt'])
  }

  udpateMessagesVisible() {
    const list = this.getMessagesVisible()
    list.forEach((item: any, index: number) => {
      if (this.messagesVisible[index] && item.messageId === this.messagesVisible[index].messageId) {
        this.messagesVisible[index] = item
      }
    })
  }

  viewportLimit(firstIndex: number, lastIndex: number) {
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

  overflowMap: any = { top: false, bottom: false }
  intersectLock: boolean = true
  onIntersect({ target, isIntersecting }: any) {
    this.overflowMap.top = false
    if (target.id === 'virtualTop') {
      this.overflowMap.top = isIntersecting
    }
    this.overflowMap.bottom = false
    if (target.id === 'virtualBottom') {
      this.overflowMap.bottom = isIntersecting
    }
    if (this.intersectLock || !target.id) return
    const index = this.messageIds.indexOf(target.id)
    const direction = this.scrollDirection
    const offset = this.threshold
    const { firstIndex, lastIndex } = this.viewport
    if (
      (isIntersecting && direction === 'up' && index < firstIndex + offset / 2) ||
      (isIntersecting && direction === 'down' && index > lastIndex - offset / 2)
    ) {
      this.viewport = this.viewportLimit(index - offset, index + offset)
    }
  }

  scrollStopTimer: any = null
  scrollStop() {
    clearTimeout(this.scrollStopTimer)
    this.scrollStopTimer = setTimeout(() => {
      this.timeDivideShowForce = true
      if (this.goMessagePosLock) return
      if (!this.infiniteUpLock && this.overflowMap.top) {
        this.viewport = this.viewportLimit(0, 2 * this.threshold)
      }
      if (!this.infiniteDownLock && this.overflowMap.bottom) {
        this.goBottom()
      }
    }, 200)
  }

  scrollTimer: any = null
  timeDivideLock: boolean = false
  scrollTimerThrottle: any = null
  showTopTipsTimer: any = null
  onScroll(obj: any) {
    if (obj) {
      this.scrollDirection = obj.direction
    }

    let list = this.$refs.messagesUl
    if (!list) return

    this.isBottom = list.scrollHeight < list.scrollTop + 1.5 * list.clientHeight
    if (this.isBottom) {
      if (!this.infiniteDownLock) {
        this.infiniteDownLock = true
        messageBox.infiniteDown()
      }
    }
    const toTop = 200 + 20 * (list.scrollHeight / list.clientHeight)
    if (list.scrollTop < toTop) {
      if (!this.infiniteUpLock) {
        clearTimeout(this.showTopTipsTimer)
        this.infiniteUpLock = true
        if (!this.showTopTips) {
          this.hideTimeDivide = true
        }
        messageBox.infiniteUp()
      }
      this.showTopTipsTimer = setTimeout(() => {
        if (this.infiniteUpLock) {
          this.showTopTips = true
        }
      }, 150)
    }

    if (!this.scrollTimerThrottle) {
      this.scrollTimerThrottle = setTimeout(() => {
        this.scrollTimerThrottle = null
      }, 50)
      clearTimeout(this.scrollTimer)
      this.scrollTimer = setTimeout(() => {
        if (list.scrollTop < toTop && !this.infiniteUpLock) {
          list.scrollTop = toTop
        }
        this.scrollStop()
      }, 100)
    }

    if (!this.isBottom && list.scrollTop > 130) {
      this.timeDivideShow = true
    } else {
      this.timeDivideShow = false
    }

    if (!this.timeDivideLock) {
      this.timeDivideLock = true
      setTimeout(() => {
        this.timeDivideLock = false
      }, 50)
      const timeDivide = this.$refs.timeDivide
      if (!timeDivide) return
      timeDivide.action()
    }
  }
  chooseAttachment() {
    this.file = null
    this.$refs.attachmentInput.click()
  }
  chooseAttachmentDone(event: any) {
    this.file = event.target.files[0]
  }

  goMessagePosType: string = ''
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
      messageBox.setConversationId(this.conversation.conversationId, count - messageIndex - 1, false)
      this.searchKeyword = keyword
      this.goSearchPos = false
      this.$refs.inputBox.boxFocusAction()
    })
  }

  goMessagePosLock: boolean = false
  goMessagePosTimer: any = null
  goMessagePosAction(posMessage: any, goDone: boolean, beforeScrollTop: number) {
    setTimeout(() => {
      this.infiniteDownLock = false
      let targetDom: any = document.querySelector('.unread-divide')
      let messageDom: any
      if (posMessage && posMessage.messageId && !targetDom) {
        messageDom = document.getElementById(posMessage.messageId)
        if (!this.searchKeyword && messageDom) {
          messageDom.className = 'notice'
        }
      }
      if (!targetDom && !messageDom) {
        setTimeout(() => {
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
          if (
            this.goMessagePosType === 'search' ||
            list.scrollTop + list.clientHeight < messageDom.offsetTop ||
            list.scrollTop > messageDom.offsetTop
          ) {
            list.scrollTop = messageDom.offsetTop - 1
          }
          setTimeout(() => {
            messageDom.className = ''
          }, 200)
        } else {
          list.scrollTop = targetDom.offsetTop - 1
        }
        this.showMessages = true
        this.goMessagePosTimer = setTimeout(() => {
          this.goMessagePosLock = false
        }, 600)
      }
    })
  }

  goMessagePos(posMessage: any) {
    let goDone = false
    let beforeScrollTop = 0

    let { firstIndex, lastIndex } = this.viewport
    const posIndex = this.messageIds.indexOf(posMessage.messageId)
    if (posIndex > -1) {
      const offset = this.threshold
      if (firstIndex > posIndex - offset / 2) {
        firstIndex -= offset
      } else if (posIndex + offset / 2 > lastIndex) {
        lastIndex += offset
      }
    } else {
      const { conversationId } = this.conversation
      const count = messageDao.ftsMessageCount(conversationId)
      const messageIndex = messageDao.ftsMessageIndex(conversationId, posMessage.messageId)
      messageBox.setConversationId(conversationId, count - messageIndex - 1, false)
      firstIndex = 0
      lastIndex = this.threshold
    }
    this.showScroll = false
    this.beforeViewport = {}
    this.goMessagePosLock = true
    clearTimeout(this.goMessagePosTimer)
    this.viewport = this.viewportLimit(firstIndex, lastIndex)
    setTimeout(() => {
      this.goMessagePosAction(posMessage, goDone, beforeScrollTop)
      this.showScroll = true
    }, 100)
  }

  goBottomTimer: any = null
  goBottom(currentMessageLen: number = 0) {
    this.showScroll = false
    this.isBottom = true
    this.intersectLock = true
    this.beforeUnseenMessageCount = 0
    this.beforeViewport = {}
    this.currentUnreadNum = 0
    this.searchKeyword = ''
    const msgLen = this.messages.length
    const waitTime = currentMessageLen > 0 && currentMessageLen !== msgLen ? 100 : 10
    clearTimeout(this.goBottomTimer)
    this.goBottomTimer = setTimeout(() => {
      let list = this.$refs.messagesUl
      if (!list) {
        return
      }
      this.viewport = this.viewportLimit(msgLen - 2 * this.threshold, msgLen - 1)
      this.infiniteUpLock = false
      this.showMessages = true
      requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight
      })
      setTimeout(() => {
        if (list.scrollTop !== list.scrollHeight) {
          list.scrollTop = list.scrollHeight
        }
        this.showScroll = true
      }, 100)
    }, waitTime)
    messageBox.clearUnreadNum()
  }

  markMentionReadTimer: any = null
  mentionVisibleUpdate(payload: any) {
    const { messageId, isIntersecting } = payload
    const { conversationId } = this.conversation
    const mentions = this.conversationUnseenMentionsMap[conversationId]
    if (mentions && mentions.length > 0) {
      mentions.forEach((item: any) => {
        if (item.message_id === messageId) {
          if (isIntersecting) {
            this.actionMarkMentionRead({ conversationId, messageId })
          }
        }
      })
    }
    clearTimeout(this.markMentionReadTimer)
    this.markMentionReadTimer = setTimeout(() => {
      if (this.isBottom && isIntersecting) {
        this.actionMarkMentionRead({ conversationId, messageId })
      }
    }, 100)
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
  detailUserId: string = ''
  showDetails(id: string) {
    this.detailUserId = id
    requestAnimationFrame(() => {
      this.details = true
    })
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
    this.$goConversationPos('current')
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
      browser.loadURL(action, this.conversation.conversationId)
    }
  }
  chatSearch() {
    this.actionSetSearching('key:')
    this.goMessagePosType = 'search'
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
      box-shadow: 0 0.05rem 0.05rem #aaaaaa33;
    }
  }
  .hide-time-divide {
    /deep/ .time-divide.inner {
      opacity: 0;
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
