<template>
  <div class="navigation">
    <div class="root">
      <div class="header" :style="{'justify-content': this.isMacOS ? 'flex-end': 'space-between'}">
        <Avatar id="avatar" :user="me" :conversaton="null" @onAvatarClick="showProfile" />
        <div class="action_bar">
          <div id="edit" @click="showConveresation">
            <ICEdit />
          </div>
          <Dropdown id="menu" :menus="menus" @onItemClick="onItemClick"></Dropdown>
        </div>
      </div>
      <div class="signal" v-show="linkStatus!=LinkStatus.CONNECTED">
        <ICSignal class="signal_icon"></ICSignal>
        <div class="content">
          <label class="title">{{getLinkTitle()}}</label>
          <label class="info">{{getLinkContent()}}</label>
        </div>
      </div>
      <div class="show-more" v-if="showMoreType" @click="showMoreBack">
        <ICBack />
        {{ $t({
        contacts: 'chat.chat_contacts',
        chats: 'chat.chat_chats',
        messages: 'chat.chat_messages' }[showMoreType])
        }}
      </div>
      <search class="nav" @input="onInput"></search>

      <h5
        v-if="Object.keys(conversations).length === 0 && !searchKeyword && !showMoreType"
      >{{$t('conversation.empty')}}</h5>

      <mixin-scrollbar>
        <div class="conversations ul">
          <ul v-if="!showMoreType && conversations && !(searchResult.contact||searchResult.group)">
            <ConversationItem
              v-for="conversation in conversations"
              :key="conversation.conversationId"
              :conversation="conversation"
              :class="{active:currentConversationId === conversation.conversationId}"
              @item-click="onConversationClick"
              @item-more="openMenu"
              @item-menu-click="openDownMenu"
            />
          </ul>
          <ul v-if="!showMoreType && (searchResult.contact||searchResult.chats)">
            <div class="search-id-or-phone" v-if="showIdOrPhoneSearch">
              <div>
                {{$t('chat.search_id_or_phone')}}
                <div>
                  <button class="search-button">{{searchKeyword}}</button>
                </div>
              </div>
            </div>

            <span class="listheader" v-if="searchResult.contact && searchResult.contact.length > 0">
              {{$t('chat.chat_contacts')}}
              <a
                v-if="searchResult.contactAll && searchResult.contactAll.length > 3"
                @click="showMoreList('contacts')"
              >{{$t('chat.chat_more')}}</a>
            </span>
            <div class="listbox" v-if="searchResult.contact && searchResult.contact.length > 0">
              <UserItem
                v-for="user in searchResult.contact"
                :key="user.user_id"
                :user="user"
                :keyword="searchKeyword"
                @user-click="onSearchUserClick"
              ></UserItem>
            </div>

            <span class="listheader" v-if="searchResult.chats && searchResult.chats.length > 0">
              {{$t('chat.chat_chats')}}
              <a
                v-if="searchResult.chatsAll && searchResult.chatsAll.length > 3"
                @click="showMoreList('chats')"
              >{{$t('chat.chat_more')}}</a>
            </span>
            <div class="listbox" v-if="searchResult.chats && searchResult.chats.length > 0">
              <ChatItem
                v-for="chat in searchResult.chats"
                :key="chat.conversationId"
                :chat="chat"
                :keyword="searchKeyword"
                @item-click="onSearchChatClick"
              ></ChatItem>
            </div>

            <span class="listheader" v-if="searchResult.message && searchResult.message.length > 0">
              {{$t('chat.chat_messages')}}
              <a
                v-if="searchResult.messageAll && searchResult.messageAll.length > 3"
                @click="showMoreList('messages')"
              >{{$t('chat.chat_more')}}</a>
            </span>
            <div class="listbox" v-if="searchResult.message && searchResult.message.length > 0">
              <ChatItem
                v-for="chat in searchResult.message"
                :key="chat.conversationId"
                :chat="chat"
                :keyword="searchKeyword"
                @item-click="onSearchChatClick"
              ></ChatItem>
            </div>
          </ul>

          <ul v-if="showMoreType === 'contacts'">
            <div class="listbox">
              <UserItem
                v-for="user in searchResult.contactAll"
                :key="user.user_id"
                :user="user"
                :keyword="searchKeyword"
                @user-click="onSearchUserClick"
              ></UserItem>
            </div>
          </ul>
          <ul v-if="showMoreType === 'chats'">
            <div class="listbox">
              <ChatItem
                v-for="chat in searchResult.chatsAll"
                :key="chat.conversationId"
                :chat="chat"
                :keyword="searchKeyword"
                @item-click="onSearchChatClick"
              ></ChatItem>
            </div>
          </ul>
          <ul v-if="showMoreType === 'messages'">
            <div class="listbox">
              <ChatItem
                v-for="chat in searchResult.messageAll"
                :key="chat.conversationId"
                :chat="chat"
                :keyword="searchKeyword"
                @item-click="onSearchChatClick"
              ></ChatItem>
            </div>
          </ul>
        </div>
      </mixin-scrollbar>
    </div>
    <transition name="slide-left">
      <NewConversation
        class="overlay"
        v-if="conversationShow"
        @conversation-back="hideConversation"
        @user-click="onClickUser"
        @newGroup="showGroup"
      ></NewConversation>
    </transition>
    <transition name="slide-right">
      <GroupContainer
        class="overlay"
        id="group"
        v-if="groupShow"
        @back="hideGroup"
        @success="success"
      ></GroupContainer>
    </transition>
    <transition name="slide-left">
      <ProfileContainer class="overlay" id="profile" v-if="profileShow" @profile-back="hideProfile"></ProfileContainer>
    </transition>
    <transition name="slide-left">
      <SettingContainer class="overlay" id="setting" v-if="settingShow" @setting-back="hideSetting"></SettingContainer>
    </transition>
  </div>
</template>

<script>
import ConversationItem from '@/components/ConversationItem.vue'
import Search from '@/components/Search.vue'
import GroupContainer from '@/components/GroupContainer.vue'
import ProfileContainer from '@/components/ProfileContainer.vue'
import SettingContainer from '@/components/SettingContainer.vue'
import NewConversation from '@/components/NewConversation.vue'
import Dropdown from '@/components/menu/Dropdown.vue'
import Avatar from '@/components/Avatar.vue'
import UserItem from '@/components/UserItem.vue'
import ChatItem from '@/components/ChatItem.vue'
import ICEdit from '@/assets/images/ic_edit.svg'
import ICBack from '@/assets/images/ic_back.svg'
import ICSignal from '@/assets/images/ic_signal.svg'
import workerManager from '@/workers/worker_manager.js'
import { clearDb } from '@/persistence/db_util.js'
import accountAPI from '@/api/account.js'
import conversationAPI from '@/api/conversation.js'
import { ConversationCategory, ConversationStatus, LinkStatus, MuteDuration } from '@/utils/constants.js'
import { mapGetters } from 'vuex'

export default {
  name: 'navigation',
  data() {
    return {
      conversationShow: false,
      groupShow: false,
      profileShow: false,
      settingShow: false,
      menus: this.$t('menu.personal'),
      searchKeyword: '',
      showMoreType: '',
      inputTimer: null,
      LinkStatus: LinkStatus,
      ConversationCategory: ConversationCategory,
      // eslint-disable-next-line no-undef
      isMacOS: platform.os.family === 'OS X',
      primaryPlatform: localStorage.primaryPlatform
    }
  },
  methods: {
    onItemClick(index) {
      if (index === 0) {
        this.groupShow = true
      } else if (index === 1) {
        this.profileShow = true
      } else if (index === 2) {
        this.settingShow = true
      } else if (index === 3) {
        workerManager.stop(this.exit)
      }
    },
    exit() {
      accountAPI.logout().then(resp => {
        this.$blaze.closeBlaze()
        this.$router.push('/sign_in')
        clearDb()
      })
    },
    showMoreBack() {
      this.showMoreType = ''
      this.$store.dispatch('search', {
        keyword: this.searchKeyword
      })
    },
    showMoreList(type) {
      this.showMoreType = type
      this.$store.dispatch('search', {
        keyword: this.searchKeyword,
        type: this.showMoreType
      })
    },
    openMenu(conversation) {
      const isContact = conversation.category === ConversationCategory.CONTACT
      const isMute = this.isMute(conversation)
      const menu = this.getMenu(
        isContact,
        conversation.status === ConversationStatus.QUIT,
        conversation.pinTime,
        isMute
      )
      this.$Menu.alert(event.clientX, event.clientY, menu, index => {
        const option = menu[index]
        const conversationMenu = this.$t('menu.conversation')
        this.handlerMenu(
          Object.keys(conversationMenu).find(key => conversationMenu[key] === option),
          isContact,
          conversation.conversationId,
          conversation.pinTime,
          conversation.ownerId
        )
      })
    },
    openDownMenu(conversation, index) {
      const isContact = conversation.category === ConversationCategory.CONTACT
      const isMute = this.isMute(conversation)
      const menu = this.getMenu(
        isContact,
        conversation.status === ConversationStatus.QUIT,
        conversation.pinTime,
        isMute
      )
      this.$Menu.alert(event.clientX, event.clientY + 8, menu, index => {
        const option = menu[index]
        const conversationMenu = this.$t('menu.conversation')
        this.handlerMenu(
          Object.keys(conversationMenu).find(key => conversationMenu[key] === option),
          isContact,
          conversation.conversationId,
          conversation.pinTime,
          conversation.ownerId
        )
      })
    },
    handlerMenu(position, isContact, conversationId, pinTime, ownerId) {
      if (position === 'exit_group') {
        this.$store.dispatch('exitGroup', conversationId)
      } else if (position === 'pin_to_top' || position === 'clear_pin') {
        this.$store.dispatch('pinTop', {
          conversationId: conversationId,
          pinTime: pinTime
        })
      } else if (position === 'clear') {
        this.$store.dispatch('conversationClear', conversationId)
      } else if (position === 'mute') {
        let self = this
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
            conversationAPI.mute(conversationId, duration).then(resp => {
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
      } else if (position === 'cancel_mute') {
        let self = this
        this.$Dialog.alert(
          this.$t('chat.chat_mute_cancel'),
          this.$t('ok'),
          () => {
            conversationAPI.mute(conversationId, 0).then(resp => {
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
    isMute(conversation) {
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
    },
    getMenu(isContact, isExit, pinTime, isMute) {
      const conversationMenu = this.$t('menu.conversation')
      var menu = []
      if (!isContact) {
        if (!isExit) {
          menu.push(conversationMenu.exit_group)
        }
        if (!pinTime) {
          menu.push(conversationMenu.pin_to_top)
        } else {
          menu.push(conversationMenu.clear_pin)
        }
        menu.push(conversationMenu.clear)
      } else {
        if (!pinTime) {
          menu.push(conversationMenu.pin_to_top)
        } else {
          menu.push(conversationMenu.clear_pin)
        }
        menu.push(conversationMenu.clear)
      }
      if (!isExit) {
        if (isMute) {
          menu.push(conversationMenu.cancel_mute)
        } else {
          menu.push(conversationMenu.mute)
        }
      }
      return menu
    },
    showConveresation(event) {
      this.conversationShow = true
    },
    hideConversation() {
      this.conversationShow = false
    },
    showProfile() {
      this.profileShow = true
    },
    hideProfile() {
      this.profileShow = false
    },
    showGroup() {
      this.groupShow = true
    },
    hideGroup() {
      this.groupShow = false
    },
    hideSetting() {
      this.settingShow = false
    },
    onInput(keyword) {
      this.searchKeyword = keyword
      let waitTime = 10
      if (this.showMoreType) {
        waitTime = 100
      }
      clearTimeout(this.inputTimer)
      this.inputTimer = setTimeout(() => {
        this.$store.dispatch('search', {
          keyword,
          type: this.showMoreType
        })
      }, waitTime)
    },
    success() {
      this.conversationShow = false
      this.groupShow = false
    },
    onConversationClick(conversation) {
      this.conversationShow = false
      this.$store.dispatch('searchClear')
      this.$store.dispatch('setCurrentConversation', conversation)
    },
    onClickUser(user) {
      this.conversationShow = false
      this.$store.dispatch('searchClear')
      this.$store.dispatch('createUserConversation', {
        user
      })
    },
    onSearchChatClick(conversation) {
      this.conversationShow = false
      this.$store.dispatch('setCurrentConversation', conversation)
      conversation.unseenMessageCount = 0
      setTimeout(() => {
        this.$store.dispatch('markRead', conversation.conversationId)
      }, 100)
    },
    onSearchUserClick(user) {
      this.conversationShow = false
      this.$store.dispatch('createUserConversation', {
        user
      })
    },

    getLinkTitle() {
      return this.$t('not_connected_title')
    },
    getLinkContent() {
      return this.$t('not_connected_content')
    }
  },
  components: {
    ConversationItem,
    Search,
    GroupContainer,
    NewConversation,
    Dropdown,
    ICEdit,
    ICBack,
    ICSignal,
    Avatar,
    ProfileContainer,
    SettingContainer,
    UserItem,
    ChatItem
  },
  computed: {
    showIdOrPhoneSearch() {
      // return /^\d{5,15}$/.test(this.searchKeyword)
      return false
    },
    ...mapGetters({
      currentConversationId: 'currentConversationId',
      conversations: 'getConversations',
      friends: 'findFriends',
      me: 'me',
      searchResult: 'search',
      linkStatus: 'linkStatus'
    })
  }
}
</script>

<style lang="scss" scoped>
.navigation {
  background: white;
  border-right: 1px solid #dee2e9;
  flex: 0 0 18rem;
  display: flex;
  height: 100vh;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;

  .root {
    width: 100%;
    display: flex;
    flex-direction: column;
    .conversations {
      flex: 1;
      height: 100%;
      overflow-x: hidden;
      background: #fff;
      .listheader {
        display: flex;
        justify-content: space-between;
        padding: 1rem 1.6rem 0.6rem;
        font-family: Helvetica;
        font-weight: 500;
        a {
          color: #3d75e3;
          font-size: 0.85rem;
          margin-top: 0.1rem;
          cursor: pointer;
        }
        &:nth-child(5),
        &:nth-child(3) {
          border-top: 0.5rem solid #f2f3f6;
        }
      }

      .listbox {
        padding-bottom: 1rem;
      }
    }
    .show-more {
      padding: 0.45rem 0.75rem;
      font-weight: 500;
      cursor: pointer;
      svg {
        margin: 0.25rem 0.7rem 0 1.1rem;
        vertical-align: top;
      }
    }
    .search-id-or-phone {
      text-align: center;
      background: #f2f3f6;
      padding-bottom: 0.5rem;
      & > div {
        padding: 0.75rem 0.75rem 1.25rem;
        background: #ffffff;
        box-shadow: 0 2px 10px 0 rgba(195, 195, 195, 0.2);
      }
      .search-button {
        background: #3d75e3;
        color: #ffffff;
        border: none;
        font-size: 0.8rem;
        padding: 0.3rem 0.75rem;
        margin-top: 0.5rem;
        cursor: pointer;
        box-shadow: 0 0.5rem 0.7rem 0 rgba(61, 117, 227, 0.3);
        border-radius: 0.8rem;
      }
    }
    .header {
      background: #ffffff;
      height: 3.6rem;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding-left: 1rem;
      padding-right: 1rem;
      justify-content: space-between;

      #avatar {
        width: 2.5rem;
        height: 2.5rem;
        margin-right: 2rem;
        cursor: pointer;
      }
      .action_bar {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        #edit {
          margin-right: 1rem;
          cursor: pointer;
        }
        #menu {
          cursor: pointer;
        }
      }
    }
    h5 {
      position: absolute;
      z-index: 1;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .signal {
      background: #fedd4a;
      display: flex;
      padding: 10px;
      align-items: center;
      .signal_icon {
        flex-shrink: 0;
      }
      .content {
        margin-left: 10px;
        display: flex;
        flex-direction: column;
        .title {
          font-size: 15px;
          font-weight: 500;
        }
        .info {
          font-size: 14px;
          max-lines: 2;
        }
      }
    }
  }

  .overlay {
    z-index: 10;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    top: 0;
    left: 0;
  }

  .nav {
    padding: 0.45rem 0.75rem;
    display: flex;
    align-items: center;
  }

  .slide-left-enter-active,
  .slide-left-leave-active {
    transition: all 0.3s;
  }
  .slide-left-enter,
  .slide-left-leave-to {
    transform: translateX(-100%);
  }
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: all 0.3s;
  }
  .slide-right-enter,
  .slide-right-leave-to {
    transform: translateX(200%);
  }
}
</style>
