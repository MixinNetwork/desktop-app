<template>
  <main class="chat container" @click="hideStickerChoose">
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
      <Dropdown :menus="menus" @onItemClick="onItemClick"></Dropdown>
    </header>
    <mixin-scrollbar
      :style="'transition: 0.3s all ease;' + (stickerChoosing ? 'margin-bottom: 15rem;' : '')"
      v-if="conversation"
      :goBottom="!showMessages"
    >
      <ul
        class="messages"
        ref="messagesUl"
        :style="(showMessages && !goSearchPos) ? '' : 'opacity: 0'"
        @dragenter="onDragEnter"
        @drop="onDrop"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @scroll="onScroll"
      >
        <li v-show="!user.app_id" class="encryption tips">
          <div class="bubble">{{$t('encryption')}}</div>
        </li>
        <TimeDivide
          ref="timeDivide"
          v-if="messages[0] && showMessages && timeDivideShow"
          :messageTime="contentUtil.renderTime(messages[0].createdAt)"
        />
        <MessageItem
          v-for="(item, index) in messages"
          :key="item.messageId"
          :message="item"
          :prev="messages[index-1]"
          :unread="unreadMessageId"
          :conversation="conversation"
          :me="me"
          :searchKeyword="searchKeyword"
          @user-click="onUserClick"
          @action-click="handleAction"
          @handle-item-click="handleItemClick"
        />
      </ul>
    </mixin-scrollbar>
    <transition name="fade">
      <div class="floating" v-show="conversation && !isBottom" @click="goBottomClick">
        <span class="badge" v-if="currentUnreadNum>0">{{currentUnreadNum}}</span>
        <svg-icon style="font-size: 1.8rem" icon-class="chevron-down" />
      </div>
    </transition>
    <ReplyMessageContainer
      v-if="boxMessage"
      :message="boxMessage"
      class="reply"
      @hidenReplyBox="hidenReplyBox"
    ></ReplyMessageContainer>

    <transition name="slide-up">
      <ChatSticker v-show="stickerChoosing" @send="sendSticker"></ChatSticker>
    </transition>
    <div v-show="conversation" class="action" @click.stop>
      <div v-if="!participant" class="removed">{{$t('home.removed')}}</div>
      <div v-if="participant" class="input">
        <div class="sticker" @click.stop="chooseSticker">
          <svg-icon icon-class="ic_emoticon_on" v-if="stickerChoosing" />
          <svg-icon icon-class="ic_emoticon" v-else />
        </div>
        <mixin-scrollbar style="margin-right: .2rem">
          <div class="ul editable">
            <div
              class="box"
              contenteditable="true"
              :placeholder="$t('home.input')"
              @input="saveMessageDraft"
              @keydown.enter="sendMessage"
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

    <MessageForward v-if="forwardMessage" :me="me" :message="forwardMessage" @close="handleHideMessageForward" />

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
        v-show="(dragging&&conversation) || file"
        :file="file"
        :dragging="dragging"
        @onClose="onClose"
        @sendFile="sendFile"
      ></FileContainer>
    </transition>
    <transition name="slide-right">
      <Details class="overlay" v-if="details" @close="hideDetails"></Details>
    </transition>
    <transition :name="(searching.replace(/^key:/, '') || goSearchPos) ? '' : 'slide-right'">
      <ChatSearch class="overlay" v-if="searching" @close="hideSearch" @search="goSearchMessagePos" />
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
import {
  Getter,
  Action
} from 'vuex-class'
import {
  ConversationCategory,
  ConversationStatus,
  MessageCategories,
  MessageStatus,
  MuteDuration
} from '@/utils/constants'
import contentUtil from '@/utils/content_util'
import { isImage, base64ToImage } from '@/utils/attachment_util'
import Dropdown from '@/components/menu/Dropdown.vue'
import Avatar from '@/components/Avatar.vue'
import Details from '@/components/Details.vue'
import ChatSearch from '@/components/ChatSearch.vue'
import ChatSticker from '@/components/ChatSticker.vue'
import TimeDivide from '@/components/TimeDivide.vue'
import Editor from '@/components/Editor.vue'
import FileContainer from '@/components/FileContainer.vue'
import MessageItem from '@/components/MessageItem.vue'
import MessageForward from '@/components/MessageForward.vue'
import ReplyMessageContainer from '@/components/ReplyMessageContainer.vue'
import messageDao from '@/dao/message_dao'
import conversationDao from '@/dao/conversation_dao'
import userDao from '@/dao/user_dao'
import conversationAPI from '@/api/conversation'
import messageBox from '@/store/message_box'
import browser from '@/utils/browser'
import appDao from '@/dao/app_dao'
import userApi from '@/api/user'

@Component({
  components: {
    Dropdown,
    Avatar,
    Details,
    ChatSearch,
    ChatSticker,
    TimeDivide,
    MessageItem,
    FileContainer,
    ReplyMessageContainer,
    MessageForward,
    Editor
  }
})
export default class ChatContainer extends Vue {
  @Watch('stickerChoosing')
  onStickerChoosingChanged(val: string, oldVal: string) {
    clearTimeout(this.chooseStickerTimeout)
    this.chooseStickerTimeout = setTimeout(() => {
      if (val) {
        this.goBottom()
      }
    }, 300)
  }

  @Watch('currentUnreadNum')
  onCurrentUnreadNumChanged(val: number, oldVal: string) {
    if (val === 0) {
      messageBox.clearMessagePositionIndex(0)
    }
  }

  @Watch('conversation')
  onConversationChanged(newC: any, oldC: any) {
    this.infiniteDownLock = true
    this.infiniteUpLock = false
    if ((oldC && newC && newC.conversationId !== oldC.conversationId) || (newC && !oldC)) {
      if (this.$refs.box) {
        this.$refs.box.innerHTML = this.conversation.draft || ''
      }
      this.showMessages = false
      this.beforeUnseenMessageCount = this.conversation.unseenMessageCount
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
    if (newC) {
      if (newC !== oldC) {
        if (newC.groupName) {
          this.name = newC.groupName
        } else if (newC.name) {
          this.name = newC.name
        }
        if (!oldC || newC.conversationId !== oldC.conversationId) {
          setTimeout(() => {
            if (this.$refs.box) {
              this.$refs.box.innerHTML = this.conversation.draft || ''
            }
          })
          this.details = false
          if (!this.searching.replace(/^key:/, '')) {
            this.actionSetSearching('')
          }
          this.stickerChoosing = false
          this.file = null
        }
      }
      this.updateMenu(newC)
    }
  }

  @Getter('currentConversation') conversation: any
  @Getter('searching') searching: any
  @Getter('currentUser') user: any
  @Getter('me') me: any
  @Getter('editing') editing: any

  @Action('sendMessage') actionSendMessage: any
  @Action('setSearching') actionSetSearching: any
  @Action('setCurrentUser') actionSetCurrentUser: any
  @Action('setCurrentMessages') actionSetCurrentMessages: any
  @Action('markRead') actionMarkRead: any
  @Action('sendStickerMessage') actionSendStickerMessage: any
  @Action('sendAttachmentMessage') actionSendAttachmentMessage: any
  @Action('exitGroup') actionExitGroup: any
  @Action('conversationClear') actionConversationClear: any
  @Action('toggleEditor') actionToggleEditor: any
  @Action('createUserConversation') actionCreateUserConversation: any
  @Action('recallMessage') actionRecallMessage: any

  $t: any
  $Dialog: any
  $toast: any
  $refs: any
  $moment: any
  name: any = ''
  identity: any = ''
  participant: any = true
  menus: any = []
  details: any = false
  unreadMessageId: any = ''
  MessageStatus: any = MessageStatus
  inputFlag: any = false
  dragging: any = false
  file: any = null
  messages: any[] = []
  isBottom: any = true
  boxMessage: any = null
  forwardMessage: any = null
  currentUnreadNum: any = 0
  beforeUnseenMessageCount: any = 0
  oldMsgLen: any = 0
  showMessages: any = true
  infiniteUpLock: any = false
  infiniteDownLock: any = true
  searchKeyword: any = ''
  timeDivideShow: boolean = false
  contentUtil: any = contentUtil
  stickerChoosing: boolean = false
  chooseStickerTimeout: any = null
  lastEnter: any = null
  goSearchPos: boolean = false

  mounted() {
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
      function(messages: any, data: any) {
        if (messages) {
          self.messages = messages
        }
        if (data) {
          if (!messages) {
            self.currentUnreadNum = data
            setTimeout(() => {
              self.infiniteDownLock = false
            })
          } else {
            setTimeout(() => {
              self.searchKeyword = data
            }, 100)
          }
        }
      },
      function(force: any, message: any) {
        if (force) {
          self.showMessages = false
          self.goBottom()
          setTimeout(() => {
            self.goMessagePos(message)
          })
        } else if (self.isBottom) {
          self.goBottom()
        }
        setTimeout(() => {
          if (!force) {
            self.showMessages = true
          }
          const newMsgLen = self.messages.length
          if (message) {
            self.oldMsgLen = 0
          }
          if (!self.isBottom && self.oldMsgLen) {
            self.currentUnreadNum += newMsgLen - self.oldMsgLen
          }
          self.oldMsgLen = newMsgLen
        })
      }
    )
  }

  onScroll() {
    let list = this.$refs.messagesUl
    if (!list) return
    this.isBottom = list.scrollHeight < list.scrollTop + list.clientHeight + 400
    if (this.isBottom) {
      this.currentUnreadNum = 0
      this.infiniteDown()
    }
    if (list.scrollTop < 400 + 20 * (list.scrollHeight / list.clientHeight)) {
      this.infiniteUp()
      if (list.scrollTop < 30) {
        setTimeout(() => {
          if (!this.infiniteUpLock) {
            list.scrollTop = 30
          }
        })
      }
    }
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
  chooseSticker() {
    this.boxMessage = false
    this.stickerChoosing = !this.stickerChoosing
  }
  hideStickerChoose() {
    this.stickerChoosing = false
  }
  updateMenu(newC: any) {
    const chatMenu = this.$t('menu.chat')
    let menu = []
    if (newC.category === ConversationCategory.CONTACT) {
      menu.push(chatMenu.contact_info)
      if (this.user.relationship !== 'FRIEND') {
        menu.push(chatMenu.add_contact)
      } else {
        menu.push(chatMenu.remove_contact)
      }
      menu.push(chatMenu.clear)
      this.identity = newC.ownerIdentityNumber
      this.participant = true
    } else {
      if (newC.status !== ConversationStatus.QUIT) {
        menu.push(chatMenu.exit_group)
      }
      menu.push(chatMenu.clear)
      this.identity = this.$t('chat.title_participants', { '0': newC.participants.length })
      this.participant = newC.participants.some((item: any) => {
        return item.user_id === this.me.user_id
      })
    }

    if (newC.status !== ConversationStatus.QUIT) {
      if (this.isMute(newC)) {
        menu.push(chatMenu.cancel_mute)
      } else {
        menu.push(chatMenu.mute)
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      menu.push(chatMenu.create_post)
    }
    this.menus = menu
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
    this.actionSendStickerMessage(msg)
    this.goBottom()
  }
  saveMessageDraft() {
    const conversationId = this.conversation.conversationId
    if (this.$refs.box) {
      conversationDao.updateConversationDraftById(conversationId, this.$refs.box.innerHTML)
    }
  }
  goSearchMessagePos(item: any, keyword: string) {
    this.goSearchPos = true
    setTimeout(() => {
      this.hideSearch()
      const count = messageDao.ftsMessageCount(this.conversation.conversationId)
      const messageIndex = messageDao.ftsMessageIndex(this.conversation.conversationId, item.message_id)
      messageBox.setConversationId(this.conversation.conversationId, count - messageIndex - 1)
      setTimeout(() => {
        this.searchKeyword = keyword
        this.goSearchPos = false
      })
    })
  }
  goMessagePos(posMessage: any) {
    let goDone = false
    let beforeScrollTop = 0
    this.infiniteScroll('up')
    this.infiniteScroll('down')
    const action = (beforeScrollTop: any) => {
      setTimeout(() => {
        this.infiniteDownLock = false
        let targetDom: any = document.querySelector('.unread-divide')
        if (posMessage && posMessage.messageId) {
          targetDom = document.getElementById(`m-${posMessage.messageId}`)
        }
        if (!targetDom) {
          return (this.showMessages = true)
        }
        let list = this.$refs.messagesUl
        if (!list) {
          return action(beforeScrollTop)
        }
        if (!goDone && beforeScrollTop !== list.scrollTop) {
          beforeScrollTop = list.scrollTop
          action(beforeScrollTop)
        } else {
          goDone = true
          list.scrollTop = targetDom.offsetTop
          setTimeout(() => {
            this.showMessages = true
          }, 10)
        }
      }, 10)
    }
    action(beforeScrollTop)
  }
  goBottom() {
    setTimeout(() => {
      this.infiniteUpLock = false
      this.currentUnreadNum = 0
      let list = this.$refs.messagesUl
      if (!list) return
      let scrollHeight = list.scrollHeight
      list.scrollTop = scrollHeight
      this.searchKeyword = ''
    })
  }
  goBottomClick() {
    this.showMessages = false
    messageBox.refreshConversation(this.conversation.conversationId)
    this.beforeUnseenMessageCount = 0
    this.goBottom()
    setTimeout(() => {
      this.showMessages = true
    }, 10)
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
        this.oldMsgLen += messages.length
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
  isMute(conversation: any) {
    if (conversation.category === ConversationCategory.CONTACT && conversation.ownerMuteUntil) {
      if (this.$moment().isBefore(conversation.ownerMuteUntil)) {
        return true
      }
    }
    if (conversation.category === ConversationCategory.GROUP && conversation.muteUntil) {
      if (this.$moment().isBefore(conversation.muteUntil)) {
        return true
      }
    }
    return false
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
  onClose() {
    this.file = null
    this.dragging = false
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
      const message = {
        conversationId: this.conversation.conversationId,
        mediaUrl: this.file.path,
        mediaMimeType: mimeType,
        category: category
      }
      this.actionSendAttachmentMessage(message)
      this.goBottom()
    }
    this.file = null
    this.dragging = false
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
  showDetails() {
    this.details = true
  }
  hideDetails() {
    this.details = false
    this.updateMenu(this.conversation)
  }
  changeContactRelationship(action: string) {
    userApi.updateRelationship({user_id: this.user.user_id, full_name: this.user.full_name, action}).then((res: any) => {
      if (res.data) {
        const user = res.data.data
        this.actionSetCurrentUser(user)
        this.updateMenu(this.conversation)
      }
    })
  }
  onItemClick(index: number) {
    const chatMenu = this.$t('menu.chat')
    const option = this.menus[index]
    const key = Object.keys(chatMenu).find(key => chatMenu[key] === option)

    if (key === 'contact_info') {
      this.details = true
    } else if (key === 'exit_group') {
      this.actionExitGroup(this.conversation.conversationId)
    } else if (key === 'add_contact') {
      this.changeContactRelationship('ADD')
    } else if (key === 'remove_contact') {
      const userId = this.user.user_id
      this.$Dialog.alert(
        this.$t('chat.remove_contact'),
        this.$t('ok'),
        () => {
          this.changeContactRelationship('REMOVE')
        },
        this.$t('cancel'),
        () => {
        }
      )
    } else if (key === 'clear') {
      this.$Dialog.alert(
        this.$t('chat.chat_clear'),
        this.$t('ok'),
        () => {
          this.actionConversationClear(this.conversation.conversationId)
        },
        this.$t('cancel'),
        () => {
          console.log('cancel')
        }
      )
    } else if (key === 'mute') {
      let self = this
      let ownerId = this.conversation.ownerId
      this.$Dialog.options(
        this.$t('chat.mute_title'),
        this.$t('chat.mute_menu'),
        this.$t('ok'),
        (picked: any) => {
          let duration = MuteDuration.HOURS
          if (picked === 0) {
            duration = MuteDuration.HOURS
          } else if (picked === 1) {
            duration = MuteDuration.WEEK
          } else {
            duration = MuteDuration.YEAR
          }
          conversationAPI.mute(self.conversation.conversationId, duration).then((resp: any) => {
            if (resp.data.data) {
              const c = resp.data.data
              self.$store.dispatch('updateConversationMute', { conversation: c, ownerId: ownerId })
              if (picked === 0) {
                this.$toast(this.$t('chat.mute_hours'))
              } else if (picked === 1) {
                this.$toast(this.$t('chat.mute_week'))
              } else {
                this.$toast(this.$t('chat.mute_year'))
              }
            }
          })
        },
        this.$t('cancel'),
        () => {
          console.log('cancel')
        }
      )
    } else if (key === 'cancel_mute') {
      let self = this
      let ownerId = this.conversation.ownerId
      this.$Dialog.alert(
        this.$t('chat.chat_mute_cancel'),
        this.$t('ok'),
        () => {
          conversationAPI.mute(self.conversation.conversationId, 0).then((resp: any) => {
            if (resp.data.data) {
              const c = resp.data.data
              self.$store.dispatch('updateConversationMute', { conversation: c, ownerId: ownerId })
              this.$toast(this.$t('chat.mute_cancel'))
            }
          })
        },
        this.$t('cancel'),
        () => {
          console.log('cancel')
        }
      )
    } else if (key === 'create_post') {
      this.actionToggleEditor()
    }
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

  sendMessage(event: any) {
    if (this.inputFlag === true || event.shiftKey) {
      return
    }
    event.stopPropagation()
    event.preventDefault()
    const text = contentUtil.messageFilteredText(this.$refs.box)
    if (text.trim().length <= 0) {
      return
    }
    this.stickerChoosing = false
    conversationDao.updateConversationDraftById(this.conversation.conversationId, '')
    this.$refs.box.innerText = ''
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
      this.boxMessage = null
    }
    msg.msg = message
    this.actionSendMessage(msg)
    this.goBottom()
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
  hidenReplyBox() {
    this.boxMessage = null
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
    height: 3.6rem;
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

  .action {
    font-size: 1.2rem;
    background: white;
    z-index: 1;
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
  .reply_box {
    position: relative;
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
    bottom: 72px;
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
    pointer-events: none;
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
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.3s ease;
  }
  .slide-up-enter,
  .slide-up-leave-to {
    transform: translateY(200%);
  }
}
</style>
