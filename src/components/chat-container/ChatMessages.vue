 <template>
  <mixin-scrollbar
    :style="(panelChoosing === 'stickerOpen' ? 'transition: 0.1s all;' : 'transition: 0.3s all ease;') + (panelChoosing === 'stickerOpen' ? `margin-bottom: ${panelHeight}rem;` : '')"
    v-if="conversation"
    :hideScroll="!showScroll"
    @scroll="onScroll"
    class="chat-messages"
  >
    <TimeDivide
      ref="timeDivide"
      v-if="messagesVisible[0] && timeDivideShowForce && !details"
      v-show="showMessages && timeDivideShow"
      :scrolling="scrolling"
      :messageTime="contentUtil.renderTime(messagesVisible[0].createdAt)"
    />
    <ul class="messages" ref="messagesUl" :class="{ show: showMessages }">
      <div v-intersect="onIntersect" :style="`height: ${virtualDom.top}px`" id="virtualTop"></div>
      <li v-show="!user.app_id" :style="{opacity: showTopTips ? 1 : 0}" class="encryption tips">
        <div class="bubble">{{$t('encryption')}}</div>
      </li>
      <MessageItem
        v-for="(item, index) in messagesVisible"
        :key="item.messageId"
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
        @handle-item-click="$emit('handle-item-click')"
      />
      <div v-intersect="onIntersect" :style="`height: ${virtualDom.bottom}px`" id="virtualBottom"></div>
    </ul>
  </mixin-scrollbar>
</template>

<script lang="ts">
import fs from 'fs'
// @ts-ignore
import _ from 'lodash'
import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { MessageCategories, MessageStatus, PerPageMessageCount, messageType } from '@/utils/constants'
import TimeDivide from '@/components/chat-container/TimeDivide.vue'
import MessageItem from '@/components/chat-container/MessageItem.vue'

import messageDao from '@/dao/message_dao'

import { remote } from 'electron'
import browser from '@/utils/browser'

import contentUtil from '@/utils/content_util'

import moment from 'moment'

import { delMedia, getAccount } from '@/utils/util'

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
  @Prop(Boolean) readonly showScroll: any
  @Prop(Boolean) readonly details: any
  @Prop(Boolean) readonly changeConversation: any

  @Getter('currentConversation') conversation: any
  @Getter('currentMessages') messages: any
  @Getter('currentUser') user: any
  @Getter('conversationUnseenMentionsMap') conversationUnseenMentionsMap: any

  @Action('markMentionRead') actionMarkMentionRead: any
  @Action('sendMessage') actionSendMessage: any

  @Watch('messages')
  onMessagesLengthChanged(messages: any) {
    if (messages.length === 0) {
      this.page = 0
      this.newMessageMap = {}
    }

    if (this.changeConversation) return
    if (messages.length > 0 && messages.length < PerPageMessageCount) {
      this.showTopTips = true
    }
    this.messagesVisible = this.getMessagesVisible()
    if (this.isBottom && this.conversation) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage === this.messagesVisible[this.messagesVisible.length - 1] && lastMessage.mentions) {
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
    // if (this.shadowCurrentVideo) {
    //   let currentVideoFlag = false
    //   this.messagesVisible.forEach((item: any) => {
    //     if (item.messageId === this.shadowCurrentVideo.message.messageId && !currentVideoFlag) {
    //       currentVideoFlag = true
    //     }
    //   })
    //   if (currentVideoFlag) {
    //     const currentVideo = JSON.parse(JSON.stringify(this.shadowCurrentVideo))
    //     this.actionSetCurrentVideo(currentVideo)
    //   }
    // }
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

  get messageIds() {
    const messageIds: any = []
    this.messages.forEach((msg: any) => {
      messageIds.push(msg.messageId)
    })
    return messageIds
  }

  showTopTips: boolean = false
  isBottom: any = true
  beforeViewport: any = { firstIndex: 0, lastIndex: 0 }
  messageHeightMap: any = {}
  viewport: any = { firstIndex: 0, lastIndex: 0 }
  virtualDom: any = { top: 0, bottom: 0 }
  threshold: number = 60
  timeDivideShowForce: boolean = false

  unreadMessageId: any = ''
  contentUtil: any = contentUtil

  conversationId: any
  messagePositionIndex: any
  pageDown: any
  tempCount: any
  offsetPageDown: number = 0
  newMessageMap: any = {}
  page: any
  infiniteUpLock: boolean = false
  infiniteDownLock: boolean = false

  setConversationId(conversationId: string, messagePositionIndex: number, isInit: boolean) {
    if (conversationId) {
      this.conversationId = conversationId
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

      let posMessage: any = null
      if (messagePositionIndex >= 0) {
        posMessage = messages[messages.length - (messagePositionIndex % PerPageMessageCount) - 1]
        if (messagePositionIndex % PerPageMessageCount < PerPageMessageCount / 2) {
          this.infiniteDown()
        } else {
          this.infiniteUp()
        }
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
      store.dispatch('setCurrentMessages', messages)
      this.scrollAction({ goBottom: messages.length, message: posMessage, isInit })
      let getLastMessage = false
      if (this.pageDown === 0) {
        getLastMessage = true
      }
      this.callback({ unreadNum: 0, getLastMessage })
    }
  }

  clearMessagePositionIndex(index: any) {
    this.messagePositionIndex = index
  }
  isMine(findMessage: any) {
    const account: any = getAccount()
    return findMessage.userId === account.user_id
  }
  refreshConversation(conversationId: any) {
    this.page = 0
    this.pageDown = 0
    this.tempCount = 0
    const messages = messageDao.getMessages(conversationId, 0)
    store.dispatch('setCurrentMessages', messages)
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
    store.dispatch('setCurrentMessages', finalMessages)
  }
  nextPage(direction: string): any {
    let data: unknown = []
    if (direction === 'down') {
      if (this.pageDown > 0) {
        let tempCount = 0
        if (this.tempCount > 0) {
          tempCount = this.tempCount - PerPageMessageCount
        }
        data = messageDao.getMessages(this.conversationId, --this.pageDown, tempCount)
      } else {
        this.newMessageMap = {}
        this.callback({ unreadNum: 0, getLastMessage: true })
      }
    } else {
      data = messageDao.getMessages(this.conversationId, ++this.page, this.tempCount)
    }
    return data
  }

  infiniteScroll(direction: any) {
    const messages = this.nextPage(direction)
    const messageIds: any = []
    this.messages.forEach((item: any) => {
      messageIds.push(item.messageId)
    })
    if (direction === 'down') {
      if (!messages.length) {
        setTimeout(() => {
          this.callback({ infiniteDownLock: true })
        }, 100)
        return
      }
      const newMessages = []
      const lastMessageId = this.messages[this.messages.length - 1].messageId
      for (let i = messages.length - 1; i >= 0; i--) {
        const temp = messages[i]
        if (temp.messageId === lastMessageId) {
          break
        }
        if (messageIds.indexOf(temp.messageId) < 0) {
          newMessages.unshift(temp)
        }
      }
      this.messages.push(...newMessages)
      store.dispatch('setCurrentMessages', this.messages)
      this.callback({ updateMessages: true })
    } else {
      if (!messages.length) {
        setTimeout(() => {
          this.callback({ infiniteUpLock: true })
        }, 100)
        return
      }
      const newMessages = []
      const firstMessageId = this.messages[0].messageId
      for (let i = 0; i < messages.length; i++) {
        const temp = messages[i]
        if (temp.messageId === firstMessageId) {
          break
        }
        if (messageIds.indexOf(temp.messageId) < 0) {
          newMessages.push(temp)
        }
      }
      this.messages.unshift(...newMessages)
      store.dispatch('setCurrentMessages', this.messages)
      this.callback({ updateMessages: true })
    }
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
    // this.$root.$on('goSearchMessagePos', (item: any) => {
    //   const { message, keyword, goMessagePosType } = item
    //   this.goMessagePosType = goMessagePosType
    //   this.goSearchMessagePos(message, keyword)
    // })
  }

  callback(payload: any) {
    const { updateMessages, unreadNum, infiniteUpLock, infiniteDownLock, getLastMessage } = payload
    if (updateMessages) {
      const { firstIndex, lastIndex } = this.viewport
      this.viewport = this.viewportLimit(firstIndex - this.threshold, lastIndex + this.threshold)
      this.udpateMessagesVisible()
    }
    if (unreadNum > 0 || unreadNum === 0) {
      // this.currentUnreadNum = unreadNum
      setTimeout(() => {
        this.infiniteDownLock = false
      })
    }
    if (getLastMessage) {
      // setTimeout(() => {
      //   this.getLastMessage = true
      // })
    }
    this.infiniteUpLock = infiniteUpLock
    this.infiniteDownLock = infiniteDownLock
  }

  scrollAction(payload: any) {
    const { message, isMyMsg, isInit, goBottom }: any = payload
    this.messagesVisible = this.getMessagesVisible()
    if (message) {
      if (isInit) {
        this.unreadMessageId = message.messageId
      }
      this.goMessagePos(message)
    } else if (isMyMsg || goBottom || this.isBottom) {
      if (BrowserWindow.getFocusedWindow()) {
        this.unreadMessageId = ''
      }
      this.goBottom(goBottom)
    }
  }

  goBottom(currentMessageLen: number = 0) {
    // this.isBottom = true
    // this.intersectLock = true
    // this.beforeViewport = {}
    // this.searchKeyword = ''
    const msgLen = this.messages.length
    this.$nextTick(() => {
      let list: any = this.$refs.messagesUl
      if (!list) return
      this.viewport = this.viewportLimit(msgLen - 2 * this.threshold, msgLen - 1)
      // this.infiniteUpLock = false
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
      }, 100)
    })
    this.newMessageMap = {}
  }

  beforeDestroy() {
    this.$root.$off('goSearchMessagePos')
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
    this.goMessagePosAction(posMessage, goDone, beforeScrollTop)
    // setTimeout(() => {
    //   this.showScroll = true
    // }, 300)
  }

  onUserClick(userId: any) {
    // let user = userDao.findUserById(userId)
    // this.showDetails(user)
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
      // this.goBottom()
    } else if (action.startsWith('mention:')) {
      const identityNumber = action.split('mention:')[1]
      // const user = userDao.findUserByIdentityNumber(identityNumber)
      // this.showDetails(user)
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

  scrolling: boolean = false
  scrollStopTimer: any = null
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
        // this.goBottom()
      }
    }, 200)
  }

  scrollDirection: string = ''

  timeDivideShow: boolean = false

  scrollTimer: any = null
  timeDivideLock: boolean = false
  scrollTimerThrottle: any = null
  showTopTipsTimer: any = null
  onScroll(obj: any) {
    if (obj) {
      this.scrollDirection = obj.direction
    }

    let list: any = this.$refs.messagesUl
    if (!list) return

    this.isBottom = list.scrollHeight < list.scrollTop + 1.5 * list.clientHeight
    if (this.isBottom) {
      if (!this.infiniteDownLock) {
        this.infiniteDownLock = true
        this.infiniteDown()
      }
    }
    const toTop = 200 + 20 * (list.scrollHeight / list.clientHeight)
    if (list.scrollTop < toTop) {
      if (!this.infiniteUpLock) {
        clearTimeout(this.showTopTipsTimer)
        this.infiniteUpLock = true
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

  mentionMarkedMap: any = {}
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

  showMessages: any = true
  goMessagePosType: string = ''
  // goSearchMessagePos(item: any, keyword: string) {
  //   this.unreadMessageId = ''
  //   this.goSearchPos = true
  //   if (keyword) {
  //     this.showMessages = false
  //   }
  //   setTimeout(() => {
  //     // this.hideSearch()
  //     const count = messageDao.ftsMessageCount(this.conversation.conversationId)
  //     const messageIndex = messageDao.ftsMessageIndex(
  //       this.conversation.conversationId,
  //       item.message_id || item.messageId
  //     )
  //     if (messageIndex < 0) return
  //     // this.setConversationId(this.conversation.conversationId, count - messageIndex - 1, false)
  //     this.searchKeyword = keyword
  //     this.goSearchPos = false
  //     this.$refs.inputBox.boxFocusAction()
  //   })
  // }

  mentionClick() {
    const { conversationId } = this.conversation
    const mentions = this.conversationUnseenMentionsMap[conversationId]
    if (mentions && mentions.length > 0) {
      const message = mentions[0]
      const messageId = message.message_id
      message.messageId = messageId
      this.unreadMessageId = ''
      // this.goMessagePos(message)
      // this.actionMarkMentionRead({ conversationId, messageId })
      // this.$refs.inputBox.boxFocusAction(true)
    }
  }

  searchKeyword: any = ''

  goMessagePosLock: boolean = false
  goMessagePosTimer: any = null
  goMessagePosAction(posMessage: any, goDone: boolean, beforeScrollTop: number) {
    // if (this.getLastMessage) {
    //   this.getLastMessage = false
    // }
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
        // this.showMessages = true
        return
      }
      if (!this.goMessagePosTimer) {
        this.goMessagePosTimer = setTimeout(() => {
          goDone = true
        }, 300)
      }
      let list: any = this.$refs.messagesUl
      if (!list) return
      if (!goDone && beforeScrollTop !== list.scrollTop) {
        beforeScrollTop = list.scrollTop
        this.goMessagePosAction(posMessage, goDone, beforeScrollTop)
      } else {
        goDone = true
        clearTimeout(this.goMessagePosTimer)
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
        // this.showMessages = true
        this.goMessagePosLock = false
      }
    })
  }

  udpateMessagesVisible() {
    const list = this.getMessagesVisible()
    list.forEach((item: any, index: number) => {
      if (this.messagesVisible[index] && item.messageId === this.messagesVisible[index].messageId) {
        this.messagesVisible[index] = item
      }
    })
  }

  onMessageLoaded(dom: any) {
    const { messageId, height } = dom
    this.messageHeightMap[messageId] = height
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
