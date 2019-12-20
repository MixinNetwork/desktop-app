<template>
  <main class="chat container">
    <header v-show="conversation">
      <Avatar :conversation="conversation" @onAvatarClick="showDetails" />
      <div class="title" @click="showDetails">
        <div class="username">{{name}}</div>
        <div class="identity number">{{identity}}</div>
      </div>
      <div class="search" @click="chatSearch">
        <ICSearch />
      </div>
      <div class="bot" v-if="user&&user.app_id!=null" @click="openUrl">
        <ICBot />
      </div>
      <Dropdown :menus="menus" @onItemClick="onItemClick"></Dropdown>
    </header>
    <mixin-scrollbar v-if="conversation" :goBottom="!showMessages">
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
        <infinite-loading direction="top" @infinite="infiniteUp" ref="infiniteUp">
          <div slot="spinner"></div>
          <div slot="no-more"></div>
          <div slot="no-results"></div>
        </infinite-loading>
        <li v-show="!user.app_id" class="encryption tips">
          <div class="bubble">{{$t('encryption')}}</div>
        </li>
        <MessageItem
          v-for="(item, index) in messages"
          :key="item.messageId"
          :message="item"
          :prev="messages[index-1]"
          :unread="unreadMessageId"
          :conversation="conversation"
          :me="me"
          @user-click="onUserClick"
          @handle-item-click="handleItemClick"
        />
        <infinite-loading direction="down" @infinite="infiniteDown" ref="infiniteDown">
          <div slot="spinner"></div>
          <div slot="no-more"></div>
          <div slot="no-results"></div>
        </infinite-loading>
      </ul>
    </mixin-scrollbar>
    <transition name="fade">
      <div class="floating" v-show="conversation && !isBottom" @click="goBottomClick">
        <span class="badge" v-if="currentUnreadNum>0">{{currentUnreadNum}}</span>
        <ICChevronDown />
      </div>
    </transition>
    <ReplyMessageContainer
      v-if="boxMessage"
      :message="boxMessage"
      class="reply"
      @hidenReplyBox="hidenReplyBox"
    ></ReplyMessageContainer>
    <div v-show="conversation" class="action">
      <div v-if="!participant" class="removed">{{$t('home.removed')}}</div>
      <div v-if="participant" class="input">
        <div class="attachment" @click="chooseAttachment">
          <input type="file" v-if="!file" ref="attachmentInput" @change="chooseAttachmentDone" />
          <ICAttach style="margin-top: 3px" />
        </div>
        <mixin-scrollbar style="margin-right: .2rem">
          <div class="ul editable">
            <div
              class="box"
              contenteditable="true"
              :placeholder="$t('home.input')"
              @keydown.enter="sendMessage"
              @compositionstart="inputFlag = true"
              @compositionend="inputFlag = false"
              ref="box"
            ></div>
          </div>
        </mixin-scrollbar>
        <!-- <font-awesome-icon :icon="['far', 'paper-plane']" @click="sendMessage"/> -->
        <div @click="sendMessage">
          <ICSend />
        </div>
      </div>
    </div>

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
    <transition name="slide-right">
      <ChatSearch class="overlay" v-if="searching" @close="hideSearch" @search="goSearchMessagePos"></ChatSearch>
    </transition>
  </main>
</template>

<script>
import { mapGetters } from 'vuex'
import {
  ConversationCategory,
  ConversationStatus,
  MessageCategories,
  MessageStatus,
  MuteDuration,
  PerPageMessageCount
} from '@/utils/constants.js'
import contentUtil from '@/utils/content_util.js'
import { isImage, base64ToImage } from '@/utils/attachment_util.js'
import Dropdown from '@/components/menu/Dropdown.vue'
import Avatar from '@/components/Avatar.vue'
import Details from '@/components/Details.vue'
import ChatSearch from '@/components/ChatSearch.vue'
import FileContainer from '@/components/FileContainer.vue'
import MessageItem from '@/components/MessageItem.vue'
import messageDao from '@/dao/message_dao'
import userDao from '@/dao/user_dao.js'
import conversationAPI from '@/api/conversation.js'
import moment from 'moment'
import messageBox from '@/store/message_box.js'
import ICBot from '../assets/images/ic_bot.svg'
import ICSearch from '../assets/images/ic_search.svg'
import ICSend from '../assets/images/ic_send.svg'
import ICAttach from '../assets/images/ic_attach.svg'
import browser from '@/utils/browser.js'
import appDao from '@/dao/app_dao'
import ICChevronDown from '@/assets/images/chevron-down.svg'
import ReplyMessageContainer from '@/components/ReplyMessageContainer'

export default {
  name: 'ChatContainer',
  data() {
    return {
      name: '',
      identity: '',
      participant: true,
      menus: [],
      details: false,
      searching: false,
      unreadMessageId: '',
      MessageStatus: MessageStatus,
      inputFlag: false,
      dragging: false,
      file: null,
      messages: [],
      isBottom: true,
      boxMessage: null,
      forwardList: false,
      currentUnreadNum: 0,
      beforeUnseenMessageCount: 0,
      oldMsgLen: 0,
      showMessages: true,
      infiniteUpLock: false,
      infiniteDownLock: true
    }
  },
  watch: {
    conversation: function(newC, oldC) {
      this.infiniteDownLock = true
      if ((oldC && newC && newC.conversationId !== oldC.conversationId) || (newC && !oldC)) {
        this.showMessages = false
        if (this.$refs.infiniteUp) {
          this.$refs.infiniteUp.stateChanger.reset()
        }
        if (this.$refs.infiniteDown) {
          this.$refs.infiniteDown.stateChanger.reset()
        }
        this.beforeUnseenMessageCount = this.conversation.unseenMessageCount
        this.messages = messageBox.messages
        if (newC) {
          let unreadMessage = messageDao.getUnreadMessage(newC.conversationId)
          if (unreadMessage) {
            this.unreadMessageId = unreadMessage.message_id
            this.goMessagePos()
          } else {
            this.unreadMessageId = ''
          }
        }
        Promise.resolve().then(() => {
          this.$store.dispatch('markRead', newC.conversationId)
        })
      }
      if (newC) {
        if (newC !== oldC) {
          if (newC.groupName) {
            this.name = newC.groupName
          } else if (newC.name) {
            this.name = newC.name
          }
          if (!oldC || newC.conversationId !== oldC.conversationId) {
            this.details = false
            this.searching = false
            this.file = null
          }
        }
        const chatMenu = this.$t('menu.chat')
        var menu = []
        if (newC.category === ConversationCategory.CONTACT) {
          menu.push(chatMenu.contact_info)
          menu.push(chatMenu.clear)
          this.identity = newC.ownerIdentityNumber
          this.participant = true
        } else {
          if (newC.status !== ConversationStatus.QUIT) {
            menu.push(chatMenu.exit_group)
          }
          menu.push(chatMenu.clear)
          this.identity = this.$t('chat.title_participants', { '0': newC.participants.length })
          this.participant = newC.participants.some(item => {
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
        this.menus = menu
      }
    }
  },
  components: {
    Dropdown,
    Avatar,
    Details,
    ChatSearch,
    MessageItem,
    FileContainer,
    ICBot,
    ICSearch,
    ICChevronDown,
    ICSend,
    ICAttach,
    ReplyMessageContainer
  },
  computed: {
    ...mapGetters({
      conversation: 'currentConversation',
      user: 'currentUser',
      me: 'me'
    })
  },
  mounted() {
    let self = this
    document.onpaste = function(e) {
      if (!self.conversation) return
      e.preventDefault()
      const items = (event.clipboardData || event.originalEvent.clipboardData).items
      let blob = null
      let mimeType = null

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          mimeType = items[i].type
          blob = items[i].getAsFile()
          break
        }
      }
      if (blob !== null) {
        let reader = new FileReader()
        reader.onload = async function(event) {
          self.file = await base64ToImage(event.target.result, mimeType)
        }
        reader.readAsDataURL(blob)
        return
      }
      var text = (e.originalEvent || e).clipboardData.getData('text/plain')
      if (text) {
        document.execCommand('insertText', false, text)
      }
    }
    messageBox.bindData(
      function(messages) {
        self.messages = messages
      },
      function(force, message) {
        if (self.isBottom) {
          self.goBottom()
        }
        if (force) {
          self.goBottom()
          self.goMessagePos(message)
        }
        setTimeout(() => {
          if (!force) {
            self.showMessages = true
          }
          const newMsgLen = self.messages.length
          if (!self.oldMsgLen) {
            self.oldMsgLen = newMsgLen
          }
          if (!self.isBottom) {
            self.currentUnreadNum += newMsgLen - self.oldMsgLen
          }
          self.oldMsgLen = newMsgLen
        })
      }
    )
  },
  lastEnter: null,
  methods: {
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
      }
    },
    chooseAttachment() {
      this.file = null
      this.$refs.attachmentInput.click()
    },
    chooseAttachmentDone(event) {
      this.file = event.target.files[0]
    },
    goSearchMessagePos(item) {
      this.hideSearch()
      messageBox.setConversationId(this.conversation.conversationId, item.message_index)
    },
    goMessagePos(posMessage) {
      let goDone = false
      let beforeScrollTop = 0
      this.infiniteScroll(null, 'down')
      this.infiniteDownLock = false
      const action = beforeScrollTop => {
        setTimeout(() => {
          let targetDom = document.querySelector('.unread-divide')
          if (!targetDom && posMessage) {
            targetDom = document.getElementById(`m-${posMessage.messageId}`)
          }
          if (!targetDom) {
            return (this.showMessages = true)
          }
          let list = this.$refs.messagesUl
          if (!targetDom || !list) {
            return action(beforeScrollTop)
          }
          this.infiniteDownLock = false
          if (!goDone && beforeScrollTop !== list.scrollTop) {
            beforeScrollTop = list.scrollTop
            action(beforeScrollTop)
          } else {
            goDone = true
            list.scrollTop = targetDom.offsetTop
            this.showMessages = true
          }
        }, 10)
      }
      action(beforeScrollTop)
    },
    goBottom() {
      setTimeout(() => {
        this.currentUnreadNum = 0
        let list = this.$refs.messagesUl
        if (!list) return
        let scrollHeight = list.scrollHeight
        list.scrollTop = scrollHeight
      })
    },
    goBottomClick() {
      if (this.beforeUnseenMessageCount > PerPageMessageCount || this.messages.length > 300) {
        this.showMessages = false
        messageBox.refreshConversation(this.conversation.conversationId)
      }
      this.beforeUnseenMessageCount = 0
      this.goBottom()
      setTimeout(() => {
        this.showMessages = true
      }, 10)
    },
    infiniteScroll($state, direction) {
      messageBox.nextPage(direction).then(messages => {
        if (messages) {
          if (direction === 'down') {
            this.messages.push(...messages)
          } else {
            this.messages.unshift(...messages)
          }
          this.oldMsgLen += messages.length
          if (!$state) return
          $state.loaded()
        } else {
          if (!$state) return
          $state.complete()
        }
      })
    },
    infiniteUp($state) {
      if (this.infiniteUpLock) return
      this.infiniteScroll($state, 'up')
    },
    infiniteDown($state) {
      if (this.infiniteDownLock) return
      this.infiniteScroll($state, 'down')
    },
    isMute: function(conversation) {
      if (conversation.category === ConversationCategory.CONTACT && conversation.ownerMuteUntil) {
        if (moment().isBefore(conversation.ownerMuteUntil)) {
          return true
        }
      }
      if (conversation.category === ConversationCategory.GROUP && conversation.muteUntil) {
        if (moment().isBefore(conversation.muteUntil)) {
          return true
        }
      }
      return false
    },
    onDragEnter(e) {
      this.lastEnter = e.target
      e.preventDefault()
      this.dragging = true
    },
    onDragLeave(e) {
      if (this.lastEnter === e.target) {
        e.stopPropagation()
        e.preventDefault()
        this.dragging = false
      }
    },
    onClose() {
      this.file = null
      this.dragging = false
    },
    sendFile() {
      if (!this.file) return
      let size = this.file.size
      if (size / 1000 > 30000) {
        this.$toast(this.$t('chat.chat_file_invalid_size'))
      } else {
        let image = isImage(this.file.type)
        var category
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
        this.$store.dispatch('sendAttachmentMessage', message)
        this.goBottom()
      }
      this.file = null
      this.dragging = false
    },
    onDragOver(e) {
      e.preventDefault()
    },
    onDrop(e) {
      e.preventDefault()
      var fileList = e.dataTransfer.files
      if (fileList.length > 0) {
        this.file = fileList[0]
      }
      this.dragging = false
    },
    closeFile() {
      this.dragging = false
      this.file = null
    },
    showDetails() {
      this.details = true
    },
    hideDetails() {
      this.details = false
    },
    onItemClick(index) {
      const chatMenu = this.$t('menu.chat')
      const option = this.menus[index]
      const key = Object.keys(chatMenu).find(key => chatMenu[key] === option)

      if (key === 'contact_info') {
        this.details = true
      } else if (key === 'exit_group') {
        this.$store.dispatch('exitGroup', this.conversation.conversationId)
      } else if (key === 'clear') {
        this.$Dialog.alert(
          this.$t('chat.chat_clear'),
          this.$t('ok'),
          () => {
            this.$store.dispatch('conversationClear', this.conversation.conversationId)
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
          picked => {
            let duration = MuteDuration.HOURS
            if (picked === 0) {
              duration = MuteDuration.HOURS
            } else if (picked === 1) {
              duration = MuteDuration.WEEK
            } else {
              duration = MuteDuration.YEAR
            }
            conversationAPI.mute(self.conversation.conversationId, duration).then(resp => {
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
            conversationAPI.mute(self.conversation.conversationId, 0).then(resp => {
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
      }
    },
    onUserClick(userId) {
      let user = userDao.findUserById(userId)
      this.$store.dispatch('createUserConversation', {
        user
      })
    },
    chatSearch() {
      this.searching = true
    },
    hideSearch() {
      this.searching = false
    },
    openUrl() {
      let app = appDao.findAppByUserId(this.user.app_id)
      if (app) {
        browser.loadURL(app.home_uri)
      }
    },
    sendMessage(event) {
      if (this.inputFlag === true || event.shiftKey) {
        return
      }
      event.stopPropagation()
      event.preventDefault()
      const text = contentUtil.messageFilteredText(this.$refs.box)
      if (text.trim().length <= 0) {
        return
      }
      this.$refs.box.innerText = ''
      const category = this.user.app_id ? 'PLAIN_TEXT' : 'SIGNAL_TEXT'
      const status = MessageStatus.SENDING
      const message = {
        conversationId: this.conversation.conversationId,
        content: text.trim(),
        category: category,
        status: status
      }
      let msg = {}
      if (this.boxMessage) {
        msg.quoteId = this.boxMessage.messageId
        this.boxMessage = null
      }
      msg.msg = message
      this.$store.dispatch('sendMessage', msg)
      this.goBottom()
    },
    handleItemClick({ type, message }) {
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
    },
    handleReply(message) {
      this.boxMessage = message
    },
    handleForward(message) {
      this.forwardList = true
    },
    handleRemove(message) {
      if (!message) return
      messageBox.deleteMessages([message.messageId])
    },
    handleRecall(message) {
      if (!message) return
      this.$store.dispatch('recallMessage', {
        messageId: message.messageId,
        conversationId: message.conversationId
      })
    },
    hidenReplyBox() {
      this.boxMessage = null
    },
    handleHideMessageForward(el) {
      this.forwardList = false
    },
    handleShowMessageForward() {
      this.forwardList = true
    }
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
      padding-left: 0.8rem;
    }
    .bot,
    .search {
      z-index: 1;
      width: 32px;
      height: 32px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .username {
      width: 12rem;
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
      .attachment {
        position: relative;
        input {
          position: absolute;
          opacity: 0;
          z-index: -1;
        }
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
    .send {
      padding: 0 0.6rem;
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
        font-size: 30px;
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
    border-radius: 28px;
    width: 40px;
    height: 40px;
    background: #fafafa;
    right: 20px;
    position: absolute;
    bottom: 72px;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
    .badge {
      position: absolute;
      top: -6px;
      background: #4b7ed2;
      border-radius: 20px;
      box-sizing: border-box;
      color: #fff;
      font-size: 13px;
      padding: 1px 5px;
    }
  }

  .overlay {
    position: absolute;
    left: 18rem;
    right: 0;
    height: 100%;
    border-left: 1px solid $border-color;
    z-index: 10;
  }
  .overlay-reply {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    height: 100%;
    border-left: 1px solid $border-color;
    z-index: 10;
  }

  .media {
    position: absolute;
    height: 100%;
    left: 18rem;
    border-left: 1px solid $border-color;
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
    transition: all 0.3s;
  }
  .slide-right-enter,
  .slide-right-leave-to {
    transform: translateX(100%);
  }
  .slide-bottom-enter-active,
  .slide-bottom-leave-active {
    transition: all 0.3s;
  }
  .slide-bottom-enter,
  .slide-bottom-leave-to {
    transform: translateY(200%);
  }
  .slide-bottom-enter-active,
  .slide-bottom-leave-active {
    transition: all 0.3s;
  }
  .slide-bottom-enter,
  .slide-bottom-leave-to {
    transform: translateY(200%);
  }
}
</style>
