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
import { MessageCategories, MessageStatus, PerPageMessageCount } from '@/utils/constants'
import TimeDivide from '@/components/chat-container/TimeDivide.vue'
import MessageItem from '@/components/chat-container/MessageItem.vue'

import messageDao from '@/dao/message_dao'
import messageBox from '@/store/message_box'

import { remote } from 'electron'
import browser from '@/utils/browser'

import contentUtil from '@/utils/content_util'
let { BrowserWindow } = remote

@Component({
  components: {
    TimeDivide,
    MessageItem
  }
})
export default class ChatContainer extends Vue {
  @Prop(String) readonly panelChoosing: any
  @Prop(Boolean) readonly showScroll: any
  @Prop(Boolean) readonly details: any
  @Prop(Boolean) readonly changeConversation: any

  @Getter('currentConversation') conversation: any
  @Getter('currentMessages') messages: any
  @Getter('currentUser') user: any
  @Getter('conversationUnseenMentionsMap') conversationUnseenMentionsMap: any

  @Action('markMentionRead') actionMarkMentionRead: any
  @Action('sendMessage') actionSendMessage: any

  @Watch('messages.length')
  onMessagesLengthChanged(val: number) {
    if (this.changeConversation) return
    if (val > 0 && val < PerPageMessageCount) {
      this.showTopTips = true
    }
    this.messagesVisible = this.getMessagesVisible()
    if (this.isBottom && this.conversation) {
      const lastMessage = this.messages[this.messages.length - 1]
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

  infiniteUpLock: any = false
  infiniteDownLock: any = false

  unreadMessageId: any = ''
  contentUtil: any = contentUtil

  mounted() {
    // this.$root.$on('goSearchMessagePos', (item: any) => {
    //   const { message, keyword, goMessagePosType } = item
    //   this.goMessagePosType = goMessagePosType
    //   this.goSearchMessagePos(message, keyword)
    // })
    const self = this
    messageBox.bindData(
      function(payload: any) {
        const { updateMessages, unreadNum, infiniteUpLock, infiniteDownLock, getLastMessage } = payload
        if (updateMessages) {
          const { firstIndex, lastIndex } = self.viewport
          self.viewport = self.viewportLimit(firstIndex - self.threshold, lastIndex + self.threshold)
          self.udpateMessagesVisible()
        }
        if (unreadNum > 0 || unreadNum === 0) {
          // self.currentUnreadNum = unreadNum
          setTimeout(() => {
            self.infiniteDownLock = false
          })
        }
        if (getLastMessage) {
          // setTimeout(() => {
          //   self.getLastMessage = true
          // })
        }
        self.infiniteUpLock = infiniteUpLock
        self.infiniteDownLock = infiniteDownLock
      },
      function(payload: any) {
        const { message, isMyMsg, isInit, goBottom }: any = payload
        if (message) {
          if (isInit) {
            self.unreadMessageId = message.messageId
          }
          self.goMessagePos(message)
        } else if (isMyMsg || goBottom || self.isBottom) {
          if (BrowserWindow.getFocusedWindow()) {
            self.unreadMessageId = ''
          }
          // self.goBottom(goBottom)
        }
      }
    )
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
      messageBox.setConversationId(conversationId, count - messageIndex - 1, false)
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
        messageBox.infiniteDown()
      }
    }
    const toTop = 200 + 20 * (list.scrollHeight / list.clientHeight)
    if (list.scrollTop < toTop) {
      if (!this.infiniteUpLock) {
        clearTimeout(this.showTopTipsTimer)
        this.infiniteUpLock = true
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
  //     // messageBox.setConversationId(this.conversation.conversationId, count - messageIndex - 1, false)
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
