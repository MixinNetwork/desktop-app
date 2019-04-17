<template>
  <main class="chat container">
    <header v-show="conversation">
      <Avatar :conversation="conversation" @onAvatarClick="showDetails"/>
      <div class="title" @click="showDetails">
        <div class="username">{{name}}</div>
        <div class="identity number">{{identity}}</div>
      </div>
      <div class="bot" v-if="user&&user.app_id!=null" @click="openUrl">
        <ICBot></ICBot>
      </div>
      <Dropdown :menus="menus" @onItemClick="onItemClick"></Dropdown>
    </header>
    <ul
      class="messages"
      v-show="conversation"
      ref="messagesUl"
      @dragenter="onDragEnter"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <infinite-loading direction="top" @infinite="infiniteHandler" ref="infinite">
        <div slot="spinner"></div>
        <div slot="no-more"></div>
        <div slot="no-results"></div>
      </infinite-loading>
      <li v-show="!user.app_id" class="encryption tips">
        <div class="bubble">{{$t('encryption')}}</div>
      </li>
      <MessageItem
        v-for="(item, $index) in messages"
        v-bind:key=" $index"
        v-bind:message="item"
        v-bind:prev="messages[$index-1]"
        v-bind:unread="unreadMessageId"
        v-bind:conversation="conversation"
        v-bind:me="me"
        @user-click="onUserClick"
      />
    </ul>
    <div v-show="conversation" class="action">
      <div v-if="!participant" class="removed">{{$t('home.removed')}}</div>
      <div v-if="participant" class="input">
        <div class="editable">
          <div
            class="box"
            contenteditable="true"
            :placeholder="$t('home.input')"
            @keydown.enter="sendMessage"
            ref="box"
          ></div>
        </div>
        <font-awesome-icon :icon="['far', 'paper-plane']" @click="sendMessage"/>
      </div>
    </div>
    <div class="empty" v-if="!conversation">
      <span>
        <img src="../assets/empty.png">
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
  </main>
</template>

<script>
import { mapGetters } from 'vuex'
import {
  ConversationCategory,
  ConversationStatus,
  MessageCategories,
  MessageStatus,
  MuteDuration
} from '@/utils/constants.js'
import { isImage, base64ToImage } from '@/utils/attachment_util.js'
import Dropdown from '@/components/menu/Dropdown.vue'
import Avatar from '@/components/Avatar.vue'
import Details from '@/components/Details.vue'
import FileContainer from '@/components/FileContainer.vue'
import MessageItem from '@/components/MessageItem.vue'
import messageDao from '@/dao/message_dao'
import userDao from '@/dao/user_dao.js'
import conversationAPI from '@/api/conversation.js'
import moment from 'moment'
import InfiniteLoading from 'vue-infinite-loading'
import messageBox from '@/store/message_box.js'
import ICBot from '../assets/images/ic_bot.svg'
import browser from '@/utils/browser.js'
import appDao from '@/dao/app_dao'
export default {
  name: 'ChatContainer',
  data() {
    return {
      name: '',
      identity: '',
      participant: true,
      menus: [],
      details: false,
      unreadMessageId: '',
      MessageStatus: MessageStatus,
      inputFlag: false,
      dragging: false,
      file: null,
      messages: []
    }
  },
  watch: {
    conversation: function(newC, oldC) {
      if ((oldC && newC && newC.conversationId !== oldC.conversationId) || (newC && !oldC)) {
        this.$refs.infinite.stateChanger.reset()
        this.messages = messageBox.messages
        let self = this
        if (newC) {
          let unreadMessage = messageDao.getUnreadMessage(newC.conversationId)
          if (unreadMessage) {
            this.unreadMessageId = unreadMessage.message_id
          } else {
            this.unreadMessageId = ''
          }
        }
        this.$store.dispatch('markRead', newC.conversationId)
        setTimeout(() => {
          let scrollHeight = self.$refs.messagesUl.scrollHeight
          self.$refs.messagesUl.scrollTop = scrollHeight
        }, 5)
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
            this.file = null
          }
        }
        const chatMenu = this.$t('menu.chat')
        var menu = []
        if (newC.category === ConversationCategory.CONTACT) {
          menu.push(chatMenu[0])
          menu.push(chatMenu[2])
          this.identity = newC.ownerIdentityNumber
          this.participant = true
        } else {
          if (newC.status !== ConversationStatus.QUIT) {
            menu.push(chatMenu[1])
          }
          menu.push(chatMenu[2])
          this.identity = this.$t('chat.title_participants', { '0': newC.participants.length })
          this.participant = newC.participants.some(item => {
            return item.user_id === this.me.user_id
          })
        }

        if (newC.status !== ConversationStatus.QUIT) {
          if (this.isMute(newC)) {
            menu.push(chatMenu[4])
          } else {
            menu.push(chatMenu[3])
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
    MessageItem,
    FileContainer,
    InfiniteLoading,
    ICBot
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
    this.$refs.box.addEventListener('compositionstart', function() {
      self.inputFlag = true
    })
    this.$refs.box.addEventListener('compositionend', function() {
      self.inputFlag = false
    })
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
      function() {
        setTimeout(function() {
          let scrollHeight = self.$refs.messagesUl.scrollHeight
          self.$refs.messagesUl.scrollTop = scrollHeight
        }, 5)
      }
    )
  },
  lastEnter: null,
  methods: {
    infiniteHandler($state) {
      let self = this
      messageBox.nextPage().then(function(messages) {
        if (messages) {
          self.messages.unshift(...messages)
          $state.loaded()
        } else {
          $state.complete()
        }
      })
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
      const key = parseInt(Object.keys(chatMenu).find(key => chatMenu[key] === option))
      if (key === 0) {
        this.details = true
      } else if (key === 1) {
        this.$store.dispatch('exitGroup', this.conversation.conversationId)
      } else if (key === 2) {
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
      } else if (key === 3) {
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
      } else if (key === 4) {
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
      const text = this.$refs.box.innerText
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
      this.$store.dispatch('sendMessage', message)
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
    border-bottom: 1px solid #d7d0cb;
    padding: 0rem 1rem;
    display: flex;
    height: 3.6rem;
    align-items: center;
    background: #ededed;
    .title {
      box-sizing: border-box;
      flex: 1;
      z-index: 1;
      text-align: left;
      padding-left: 0.8rem;
    }
    .bot {
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
    }
    .editable {
      max-height: 150px;
      overflow-y: auto;
      flex-grow: 1;
      .box {
        padding: 0.45rem 0.6rem;
        font-size: 1rem;
        min-height: 1.4rem;
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

  .overlay {
    position: absolute;
    left: 18rem;
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
    pointer-events: none;
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
