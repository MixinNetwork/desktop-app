 <template>
  <mixin-scrollbar
    :style="(panelChoosing === 'stickerOpen' ? 'transition: 0.1s all;' : 'transition: 0.3s all ease;') + (panelChoosing === 'stickerOpen' ? `margin-bottom: ${panelHeight}rem;` : '')"
    :hideScroll="!showScroll"
    @scroll="onScroll"
    class="chat-messages"
  >
    <TimeDivide
      ref="timeDivide"
      v-if="messagesVisible[0] && timeDivideShowForce && !details"
      v-show="showMessages && timeDivideShow"
      :scrolling="scrolling"
      :messageTime="messageTime"
    />
    <ul class="messages" ref="messagesUl" :class="{ show: showMessages }">
      <div v-intersect="onIntersect" :style="`height: ${virtualDom.top}px`" id="virtualTop"></div>
      <li v-show="!user.app_id" :style="{opacity: showTopTips ? 1 : 0}" class="encryption tips">
        <div class="bubble">{{$t('encryption')}}</div>
      </li>
      <MessageItem
        v-for="(item, index) in messagesVisible"
        :key="item && item.messageId"
        :message="item"
        :prev="messagesVisible[index - 1]"
        :next="messagesVisible[index + 1]"
        :unread="unreadMessageId"
        :beforeCreateAt="!isBottom && !infiniteUpLock && scrolling ? messagesVisible[0].createdAt : ''"
        :searchKeyword="searchKeyword"
        v-intersect="onIntersect"
        @loaded="onMessageLoaded"
        @user-click="onUserClick"
        @action-click="handleAction"
        @handle-item-click="handleItemClick"
      />
      <div v-intersect="onIntersect" :style="`height: ${virtualDom.bottom}px`" id="virtualBottom"></div>
    </ul>
    <audio
      id="mixinAudio"
      style="display: none"
      @timeupdate="audioTimeupdate"
      @ended="audioEnded"
      :src="currentAudio && currentAudio.mediaUrl"
    ></audio>
  </mixin-scrollbar>
</template>

<script lang="ts">
import fs from 'fs'
// @ts-ignore
import _ from 'lodash'
import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { MessageCategories, isMedia, MessageStatus, PerPageMessageCount, messageType } from '@/utils/constants'
import TimeDivide from '@/components/chat-container/TimeDivide.vue'
import MessageItem from '@/components/chat-container/MessageItem.vue'
import messageDao from '@/dao/message_dao'
import { remote } from 'electron'
import browser from '@/utils/browser'
import contentUtil from '@/utils/content_util'
import moment from 'moment'
import { downloadAndRefresh, downloadQueue } from '@/utils/attachment_util'
import { keyToLine, delMedia, getAccount, getVideoPlayerStatus, setVideoPlayerStatus } from '@/utils/util'
import store from '@/store/store'
let { BrowserWindow } = remote

@Component({
  components: {
    TimeDivide,
    MessageItem
  }
})
export default class ChatContainer extends Vue {
  @Prop(String) readonly panelChoosing: any
  @Prop(Number) readonly panelHeight: any
  @Prop(Boolean) readonly details: any
  @Prop(Boolean) readonly changeConversation: any

  @Getter('currentConversation') conversation: any
  @Getter('currentMessages') messages: any
  @Getter('refreshMessageIds') refreshMessageIds: any
  @Getter('currentUser') user: any
  @Getter('conversationUnseenMentionsMap') conversationUnseenMentionsMap: any
  @Getter('currentVideo') currentVideo: any
  @Getter('currentAudio') currentAudio: any

  @Action('markMentionRead') actionMarkMentionRead: any
  @Action('sendMessage') actionSendMessage: any
  @Action('setCurrentVideo') actionSetCurrentVideo: any
  @Action('setCurrentMessages') actionSetCurrentMessages: any

  @Watch('messages.length')
  onMessagesLengthChanged(messagesLen: any) {
    if (messagesLen === 0) {
      this.page = 0
      this.newMessageMap = {}
    }

    if (this.changeConversation) return
    if (messagesLen > 0 && messagesLen < PerPageMessageCount) {
      this.showTopTips = true
    }
    this.updateMessagesVisible(true)
    if (this.isBottom && this.conversation) {
      const lastMessage = this.messages[messagesLen - 1]
      if (
        lastMessage &&
        lastMessage === this.messagesVisible[this.messagesVisible.length - 1] &&
        lastMessage.mentions
      ) {
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

    this.updateMessagesVisible()

    this.virtualDom = {
      top,
      bottom
    }
  }

  @Watch('tempUnreadMessageId')
  onTempUnreadMessageId(val: any) {
    if (val) {
      this.unreadMessageId = val
    }
  }

  @Watch('isBottom')
  onIsBottomChanged(isBottom: any) {
    this.$emit('updateVal', { isBottom })
  }

  @Watch('refreshMessageIds')
  onRefreshMessageIdsChanged(messageIds: any) {
    if (messageIds.length < 0 || !this.conversation) return

    const matchIds: any = []
    const { conversationId } = this.conversation

    const messages = this.messages

    let isCurConversation = false
    for (let i = messages.length - 1; i >= 0; i--) {
      const item = messages[i]
      if (item) {
        const isQuote = messageIds.indexOf(item.quoteId) > -1
        if (messageIds.indexOf(item.messageId) > -1 || isQuote) {
          isCurConversation = true
          const findMessage = messageDao.getConversationMessageById(conversationId, item.messageId)
          if (findMessage) {
            findMessage.lt = moment(findMessage.createdAt).format('HH:mm')
            if (isQuote) {
              let quoteContent = JSON.parse(item.quoteContent)
              const findQuoteMessage = messageDao.getConversationMessageById(conversationId, quoteContent.messageId)
              if (!findQuoteMessage) {
                quoteContent.type = 'MESSAGE_RECALL'
              } else {
                quoteContent = findQuoteMessage
              }
              messages[i].quoteContent = JSON.stringify(quoteContent)
            } else {
              matchIds.push(item.messageId)
              messages[i] = findMessage
            }
          }
        }
      }
    }

    if (matchIds.length !== messageIds.length) {
      messageIds.forEach((id: string) => {
        if (matchIds.indexOf(id) > -1) return
        const findMessage = messageDao.getConversationMessageById(conversationId, id)
        if (!findMessage || (messages[0] && findMessage.createdAt < messages[0].createdAt)) return
        findMessage.lt = moment(findMessage.createdAt).format('HH:mm')
        const account: any = getAccount()
        const isMyMsg = findMessage.userId === account.user_id
        if (this.pageDown === 0) {
          messages.push(findMessage)
          if (!isMyMsg) {
            this.newMessageMap[id] = true
          }
          let newCount = Object.keys(this.newMessageMap).length
          this.actionSetCurrentMessages(messages)
          this.page = Math.floor(messages.length / PerPageMessageCount) - 1
          this.$emit('updateVal', { currentUnreadNum: newCount, getLastMessage: true })
          this.scrollAction({ isMyMsg })
        } else {
          if (isMyMsg) {
            if (findMessage.status === MessageStatus.SENT) {
              this.setConversationId(conversationId, -1, false)
            }
          } else if (!this.newMessageMap[id]) {
            this.newMessageMap[id] = true
            const newCount = Object.keys(this.newMessageMap).length
            this.$emit('updateVal', { currentUnreadNum: newCount })
            this.tempCount = newCount % PerPageMessageCount
            const lastCount = this.messagePositionIndex % PerPageMessageCount
            const offset = Math.ceil((newCount + lastCount) / PerPageMessageCount) - this.offsetPageDown
            this.pageDown += offset
            this.offsetPageDown += offset
          }
        }
      })
    } else if (isCurConversation) {
      this.actionSetCurrentMessages(messages).then(() => {
        this.updateMessagesVisible(true)
      })
    }
  }

  @Watch('conversation.conversationId')
  onConversationChanged(newVal: any, oldVal: any) {
    clearTimeout(this.scrollStopTimer)
    this.actionSetCurrentVideo(null)
    const mixinAudio: any = document.getElementById('mixinAudio')
    if (mixinAudio) {
      mixinAudio.pause()
    }

    this.overflowMap = { top: false, bottom: false }
    this.infiniteDownLock = false
    this.infiniteUpLock = false

    this.timeDivideShowForce = false
    this.messageHeightMap = {}
    const msgLen = this.messages.length
    if (msgLen > 0 && msgLen < PerPageMessageCount) {
      this.showTopTips = true
    } else {
      this.showTopTips = false
    }
  }

  isBottom: any = true
  beforeViewport: any = { firstIndex: 0, lastIndex: 0 }
  messageHeightMap: any = {}
  viewport: any = { firstIndex: 0, lastIndex: 0 }
  virtualDom: any = { top: 0, bottom: 0 }
  threshold: number = 60
  page: any
  pageDown: any
  tempCount: any
  unreadMessageId: any = ''
  offsetPageDown: number = 0
  messagePositionIndex: any
  newMessageMap: any = {}
  infiniteUpLock: boolean = false
  infiniteDownLock: boolean = false
  showScroll: boolean = false
  currentVideoPlayer: any = null
  pictureInPictureInterval: any = null
  scrolling: boolean = false
  scrollStopTimer: any = null
  scrollDirection: string = ''
  scrollTimer: any = null
  scrollTimerThrottle: any = null
  timeDivideShow: boolean = false
  timeDivideShowForce: boolean = false
  timeDivideLock: boolean = false
  showTopTips: boolean = false
  showTopTipsTimer: any = null
  overflowMap: any = { top: false, bottom: false }
  mentionMarkedMap: any = {}
  showMessages: any = true
  searchKeyword: any = ''
  goMessagePosType: string = ''
  goMessagePosLock: boolean = false
  goMessagePosTimer: any = null
  messagesVisible: any = []

  get messageIds() {
    const messageIds: any = []
    this.messages.forEach((msg: any) => {
      messageIds.push(msg.messageId)
    })
    return messageIds
  }

  get messageTime() {
    return contentUtil.renderTime(this.messagesVisible[0].createdAt, false)
  }

  setConversationId(conversationId: string, messagePositionIndex: number, isInit: boolean) {
    if (conversationId) {
      this.messagePositionIndex = messagePositionIndex > 0 ? messagePositionIndex : 0
      let page = 0
      if (messagePositionIndex >= PerPageMessageCount) {
        page = Math.floor(messagePositionIndex / PerPageMessageCount)
      }
      const messages = messageDao.getMessages(conversationId, page)
      this.page = page
      this.pageDown = page
      this.tempCount = 0
      this.offsetPageDown = 0
      this.newMessageMap = {}
      this.infiniteDownLock = false
      this.infiniteUpLock = false
      this.showScroll = false

      let posMessage: any = null
      if (messagePositionIndex >= 0) {
        posMessage = messages[messages.length - (messagePositionIndex % PerPageMessageCount) - 1]
      }

      let markdownCount = 5
      for (let i = messages.length - 1; i >= 0; i--) {
        const type = messages[i].type
        if (['post', 'image', 'sticker'].indexOf(messageType(type)) > -1) {
          messages[i].fastLoad = true
          markdownCount--
        }
        if (markdownCount < 0) {
          break
        }
      }
      this.actionSetCurrentMessages(messages)
      let i = PerPageMessageCount
      if (messages.length < i) {
        i = messages.length
      }
      while (i-- > 0) {
        const curMessage: any = messages[i]
        if (curMessage && curMessage.type) {
          const message: any = {}
          Object.keys(curMessage).forEach((key) => {
            message[keyToLine(key)] = curMessage[key]
          })
          message.category = message.type
          const curMessageType = messageType(message.category)
          let autoDownload = !message.media_url && curMessageType === 'audio'
          const offset = new Date().valueOf() - new Date(message.created_at).valueOf()
          if (offset < 7200000 && !message.media_url && isMedia(message.type)) {
            const autoDownloadSetting = localStorage.getItem('autoDownloadSetting')
            let autoDownloadMap: any = { image: true, video: true, file: true }
            if (autoDownloadSetting) {
              autoDownloadMap = JSON.parse(autoDownloadSetting)
            }
            if (autoDownloadMap[curMessageType]) {
              autoDownload = true
            }
          }
          if (autoDownload) {
            downloadQueue.push(downloadAndRefresh, {
              args: message
            })
          }
        }
      }
      this.scrollAction({ goBottom: messages.length, message: posMessage, isInit })
      let getLastMessage = false
      if (this.pageDown === 0) {
        getLastMessage = true
      }
      setTimeout(() => {
        this.infiniteDownLock = false
      })
      this.$emit('updateVal', { currentUnreadNum: 0, getLastMessage })
    }
  }

  handleItemClick(payload: any) {
    this.$emit('handle-item-click', payload)
  }

  leavepictureinpicture() {
  }

  clearMessagePositionIndex(index: any) {
    this.messagePositionIndex = index
  }
  refreshConversation(conversationId: any) {
    this.page = 0
    this.pageDown = 0
    this.tempCount = 0
    const messages = messageDao.getMessages(conversationId, 0)
    this.actionSetCurrentMessages(messages)
  }

  deleteMessages(messageIds: any[]) {
    const messages = messageDao.getMessagesByIds(messageIds)
    delMedia(messages)
    messageDao.deleteMessageByIds(messageIds)
    const finalMessages = []
    for (let i = 0; i < this.messages.length; i++) {
      const cur = this.messages[i]
      if (messageIds.indexOf(cur.messageId) < 0) {
        finalMessages.push(cur)
      }
    }
    this.actionSetCurrentMessages(finalMessages)
  }

  infiniteScroll(direction: any) {
    const { conversationId } = this.conversation
    const messageIds: any = []
    const curMessages: any = []
    this.messages.forEach((item: any) => {
      curMessages.push(item)
      messageIds.push(item.messageId)
    })
    let messages: any = []
    if (direction === 'down') {
      if (this.pageDown > 0) {
        let tempCount = 0
        if (this.tempCount > 0) {
          tempCount = this.tempCount - PerPageMessageCount
        }
        messages = messageDao.getMessages(conversationId, --this.pageDown, tempCount)
      } else {
        this.newMessageMap = {}
        setTimeout(() => {
          this.infiniteDownLock = false
        })
        this.$emit('updateVal', { currentUnreadNum: 0, getLastMessage: true })
      }
      if (!messages.length) {
        setTimeout(() => {
          this.infiniteDownLock = true
        })
        return
      }
      const newMessages = []
      const lastMessage = curMessages[curMessages.length - 1]
      const lastMessageId = lastMessage && lastMessage.messageId
      for (let i = messages.length - 1; i >= 0; i--) {
        const temp = messages[i]
        if (temp.messageId === lastMessageId) {
          break
        }
        if (messageIds.indexOf(temp.messageId) < 0) {
          newMessages.unshift(temp)
        }
      }
      curMessages.push(...newMessages)
      this.actionSetCurrentMessages(curMessages)
    } else {
      messages = messageDao.getMessages(conversationId, ++this.page, this.tempCount)
      if (!messages.length) {
        setTimeout(() => {
          this.infiniteUpLock = true
        })
        return
      }
      const newMessages = []
      const firstMessage = curMessages[0]
      const firstMessageId = firstMessage && firstMessage.messageId
      for (let i = 0; i < messages.length; i++) {
        const temp = messages[i]
        if (temp.messageId === firstMessageId) {
          break
        }
        if (messageIds.indexOf(temp.messageId) < 0) {
          newMessages.push(temp)
        }
      }
      curMessages.unshift(...newMessages)
      this.actionSetCurrentMessages(curMessages)
    }
    const { firstIndex, lastIndex } = this.viewport
    this.viewport = this.viewportLimit(firstIndex - this.threshold, lastIndex + this.threshold)
  }
  infiniteUp() {
    if (!this.infiniteUpLock) {
      this.infiniteUpLock = true
      this.infiniteScroll('up')
      this.infiniteUpLock = false
    }
  }
  infiniteDown() {
    if (!this.infiniteDownLock) {
      this.infiniteDownLock = true
      this.infiniteScroll('down')
      this.infiniteDownLock = false
    }
  }

  mounted() {
    this.$root.$on('goSearchMessagePos', (item: any) => {
      const { message, keyword, goMessagePosType } = item
      this.goMessagePosType = goMessagePosType
      this.goSearchMessagePos(message, keyword)
    })
  }

  audioTimeupdate() {
    this.$root.$emit('audioTimeupdate')
  }

  audioEnded() {
    this.$root.$emit('audioEnded')
  }

  scrollAction(payload: any) {
    const { message, isMyMsg, isInit, goBottom }: any = payload
    if (message) {
      if (isInit) {
        this.showMessages = false
        this.unreadMessageId = message.messageId
      }
      this.$nextTick(() => {
        this.goMessagePos(message)
      })
    } else if (isMyMsg || goBottom || this.isBottom) {
      if (BrowserWindow.getFocusedWindow()) {
        this.unreadMessageId = ''
      }
      this.goBottom(goBottom)
    }
  }

  goBottom(currentMessageLen: number = 0) {
    this.isBottom = true
    this.beforeViewport = {}
    this.searchKeyword = ''
    const msgLen = this.messages.length
    this.$nextTick(() => {
      let list: any = this.$refs.messagesUl
      if (!list) return
      this.viewport = this.viewportLimit(msgLen - 2 * this.threshold, msgLen - 1)
      this.infiniteUpLock = false
      this.showMessages = true
      requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight
        this.messagesVisible.forEach((item: any) => {
          this.mentionVisibleUpdate(item.messageId)
        })
      })
      setTimeout(() => {
        if (list.scrollTop !== list.scrollHeight) {
          list.scrollTop = list.scrollHeight
        }
        setTimeout(() => {
          this.showScroll = true
        }, 200)
      }, 100)
    })
    this.newMessageMap = {}
  }

  beforeDestroy() {
    this.$root.$off('goSearchMessagePos')
  }

  goMessagePos(posMessage: any) {
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
      if (messageIndex < 0) return
      this.setConversationId(conversationId, count - messageIndex - 1, false)
      firstIndex = 0
      lastIndex = this.threshold
    }
    this.beforeViewport = {}
    this.goMessagePosLock = true
    clearTimeout(this.goMessagePosTimer)
    this.goMessagePosTimer = null
    this.viewport = this.viewportLimit(firstIndex, lastIndex)
    this.goMessagePosAction(posMessage, false, 0)
    setTimeout(() => {
      this.showScroll = true
    }, 300)
  }

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
        this.showMessages = true
        return
      }
      if (!this.goMessagePosTimer) {
        this.goMessagePosTimer = setTimeout(() => {
          goDone = true
        }, 300)
      }
      let list: any = this.$refs.messagesUl
      if (!list) return
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
      if (!goDone && beforeScrollTop !== list.scrollTop) {
        beforeScrollTop = list.scrollTop
        this.goMessagePosAction(posMessage, goDone, beforeScrollTop)
      } else {
        goDone = true
        clearTimeout(this.goMessagePosTimer)
        this.showMessages = true
        this.goMessagePosLock = false
      }
    })
  }

  onUserClick(userId: any) {
    // @ts-ignore
    this.$showUserDetail(userId)
  }

  handleAction(action: any) {
    const { conversationId } = this.conversation
    if (action.startsWith('input:')) {
      const content = action.split('input:')[1]
      const msg = {
        conversationId,
        content,
        category: 'PLAIN_TEXT',
        status: MessageStatus.SENDING
      }
      this.actionSendMessage({ msg })
      this.goBottom()
    } else if (action.startsWith('mention:')) {
      const identityNumber = action.split('mention:')[1]
      this.$emit('showDetails', identityNumber)
    } else {
      browser.loadURL(action, this.conversation.conversationId)
    }
  }

  viewportLimit(firstIndex: number, lastIndex: number) {
    if (firstIndex < 0) {
      firstIndex = 0
    }
    const cLen = this.messageIds.length
    if (lastIndex >= cLen) {
      lastIndex = cLen - 1
    }
    return {
      firstIndex,
      lastIndex
    }
  }

  scrollStop() {
    clearTimeout(this.scrollStopTimer)
    this.scrollStopTimer = setTimeout(() => {
      this.timeDivideShowForce = true
      this.scrolling = false
      if (this.goMessagePosLock) return
      if (!this.infiniteUpLock && this.overflowMap.top) {
        this.viewport = this.viewportLimit(0, 2 * this.threshold)
      }
      if (!this.infiniteDownLock && this.overflowMap.bottom) {
        this.goBottom()
      }
    }, 200)
  }

  onScroll(obj: any) {
    if (obj) {
      this.scrollDirection = obj.direction
    }

    let list: any = this.$refs.messagesUl
    if (!list) return

    this.isBottom = list.scrollHeight < list.scrollTop + 1.5 * list.clientHeight
    if (this.isBottom) {
      if (!this.infiniteDownLock) {
        this.infiniteDown()
      } else {
        this.$emit('updateVal', { currentUnreadNum: 0 })
      }
    }
    const toTop = 200 + 20 * (list.scrollHeight / list.clientHeight)
    if (list.scrollTop < toTop) {
      if (!this.infiniteUpLock) {
        clearTimeout(this.showTopTipsTimer)
        this.infiniteUp()
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
      this.scrolling = true
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
      const timeDivide: any = this.$refs.timeDivide
      if (!timeDivide) return
      timeDivide.action()
    }
  }

  onIntersect({ target, isIntersecting }: any) {
    this.overflowMap.top = false
    if (target.id === 'virtualTop') {
      this.overflowMap.top = isIntersecting
    }
    this.overflowMap.bottom = false
    if (target.id === 'virtualBottom') {
      this.overflowMap.bottom = isIntersecting
    }
    if (!target.id) return
    const index = this.messageIds.indexOf(target.id)
    const direction = this.scrollDirection
    const offset = this.threshold
    const { firstIndex, lastIndex } = this.viewport
    if (
      (isIntersecting && direction === 'up' && index < firstIndex + offset / 2) ||
      (isIntersecting && direction === 'down' && index > lastIndex - offset / 2)
    ) {
      const viewport = this.viewportLimit(index - offset, index + offset)
      if (viewport.firstIndex !== firstIndex || viewport.lastIndex !== lastIndex) {
        this.viewport = viewport
      }
    }
    const curMessage = this.messages[index]
    if (curMessage && isIntersecting && (curMessage.quoteId || curMessage.mentions)) {
      this.mentionVisibleUpdate(target.id)
    }
  }

  mentionVisibleUpdate(messageId: string) {
    if (this.mentionMarkedMap[messageId]) return
    this.mentionMarkedMap[messageId] = true
    const { conversationId } = this.conversation
    const mentions = this.conversationUnseenMentionsMap[conversationId]
    if (mentions && mentions.length > 0) {
      mentions.forEach((item: any) => {
        if (item.message_id === messageId) {
          this.actionMarkMentionRead({ conversationId, messageId })
        }
      })
    }
  }

  goSearchMessagePos(item: any, keyword: string) {
    this.unreadMessageId = ''
    if (keyword) {
      this.showMessages = false
    }
    setTimeout(() => {
      this.searchKeyword = keyword
      this.$emit('goSearchMessagePosDone', item)
    })
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
    }
  }

  onMessageLoaded(dom: any) {
    const { messageId, height } = dom
    this.messageHeightMap[messageId] = height
  }

  updateMessagesVisible(force?: boolean) {
    let visibleChanged = true
    const messagesVisible = this.getMessagesVisible()
    this.messagesVisible = messagesVisible
  }

  getMessagesVisible() {
    const list = []
    let { firstIndex, lastIndex } = this.viewport
    if (firstIndex < 0) {
      firstIndex = 0
    }
    if (lastIndex < this.threshold) {
      lastIndex = this.threshold
    }
    const ids: any = []
    for (let i = firstIndex; i < this.messages.length; i++) {
      const message = this.messages[i]
      if (message && ids.indexOf(message.messageId) < 0) {
        ids.push(message.messageId)
        list.push(message)
        if (i >= lastIndex) {
          break
        }
      }
    }
    return _.sortBy(list, ['createdAt'])
  }
}
</script>

<style lang="scss" scoped>
.chat-messages {
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
}
</style>
