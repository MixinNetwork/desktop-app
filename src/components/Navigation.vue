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
      <search class="nav" @input="onInput"></search>
      <h5 v-if="Object.keys(conversations).length==0">{{$t('conversation.empty')}}</h5>

      <mixin-scrollbar>
        <ul
          class="conversations"
          v-show="conversations && !(searchResult.contact||searchResult.group)"
        >
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
        <ul class="conversations" v-show="searchResult.contact||searchResult.chats">
          <span
            class="listheader"
            v-show="searchResult.chats && searchResult.chats.length > 0"
          >{{$t('chat.chat_chats')}}</span>
          <ChatItem
            v-for="chat in searchResult.chats"
            :key="chat.conversationId"
            :chat="chat"
            @item-click="onSearchGroupClick"
          ></ChatItem>
          <span
            class="listheader"
            v-show="searchResult.contact && searchResult.contact.length > 0"
          >{{$t('chat.chat_contact')}}</span>
          <UserItem
            v-for="user in searchResult.contact"
            :key="user.user_id"
            :user="user"
            @user-click="onSearchUserClick"
          ></UserItem>
        </ul>
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
import ICEdit from '../assets/images/ic_edit.svg'
import ICSignal from '../assets/images/ic_signal.svg'
import workerManager from '@/workers/worker_manager.js'
import { clearDb } from '@/persistence/db_util.js'
import accountAPI from '@/api/account.js'
import conversationAPI from '@/api/conversation.js'
import { ConversationCategory, ConversationStatus, LinkStatus, MuteDuration } from '@/utils/constants.js'
import { mapGetters } from 'vuex'
import moment from 'moment'
export default {
  name: 'navigation',
  data() {
    return {
      conversationShow: false,
      groupShow: false,
      profileShow: false,
      settingShow: false,
      menus: this.$t('menu.personal'),
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
    openMenu: function(conversation) {
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
    openDownMenu: function(conversation, index) {
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
    handlerMenu: function(index, isContact, conversationId, pinTime, ownerId) {
      let position = parseInt(index)
      if (position === 0) {
        this.$store.dispatch('exitGroup', conversationId)
      } else if (position === 1 || position === 2) {
        this.$store.dispatch('pinTop', {
          conversationId: conversationId,
          pinTime: pinTime
        })
      } else if (position === 3) {
        this.$store.dispatch('conversationClear', conversationId)
      } else if (position === 4) {
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
      } else if (position === 5) {
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
    getMenu: function(isContact, isExit, pinTime, isMute) {
      const conversationMenu = this.$t('menu.conversation')
      var menu = []
      if (!isContact) {
        if (!isExit) {
          menu.push(conversationMenu[0])
        }
        if (!pinTime) {
          menu.push(conversationMenu[1])
        } else {
          menu.push(conversationMenu[2])
        }
        menu.push(conversationMenu[3])
      } else {
        if (!pinTime) {
          menu.push(conversationMenu[1])
        } else {
          menu.push(conversationMenu[2])
        }
        menu.push(conversationMenu[3])
      }
      if (!isExit) {
        if (isMute) {
          menu.push(conversationMenu[5])
        } else {
          menu.push(conversationMenu[4])
        }
      }
      return menu
    },
    showConveresation: function(event) {
      this.conversationShow = true
    },
    hideConversation: function() {
      this.conversationShow = false
    },
    showProfile: function() {
      this.profileShow = true
    },
    hideProfile: function() {
      this.profileShow = false
    },
    showGroup: function() {
      this.groupShow = true
    },
    hideGroup: function() {
      this.groupShow = false
    },
    hideSetting: function() {
      this.settingShow = false
    },
    onInput: function(text) {
      this.$store.dispatch('search', {
        text
      })
    },
    success: function() {
      this.conversationShow = false
      this.groupShow = false
    },
    onConversationClick: function(conversation) {
      this.conversationShow = false
      this.$store.dispatch('searchClear')
      this.$store.dispatch('setCurrentConversation', conversation)
    },
    onClickUser: function(user) {
      this.conversationShow = false
      this.$store.dispatch('searchClear')
      this.$store.dispatch('createUserConversation', {
        user
      })
    },
    onSearchGroupClick: function(conversation) {
      this.conversationShow = false
      this.$store.dispatch('setCurrentConversation', conversation)
    },
    onSearchUserClick: function(user) {
      this.conversationShow = false
      this.$store.dispatch('createUserConversation', {
        user
      })
    },

    getLinkTitle() {
      if (this.linkStatus === LinkStatus.NOT_CONNECTED) {
        return this.$t('not_connected_title')
      } else {
        return this.$t('signal_no_title')
      }
    },
    getLinkContent() {
      if (this.linkStatus === LinkStatus.NOT_CONNECTED) {
        return this.$t('not_connected_content')
      } else {
        return this.$t('signal_no_content')
      }
    }
  },
  components: {
    ConversationItem,
    Search,
    GroupContainer,
    NewConversation,
    Dropdown,
    ICEdit,
    ICSignal,
    Avatar,
    ProfileContainer,
    SettingContainer,
    UserItem,
    ChatItem
  },
  computed: mapGetters({
    currentConversationId: 'currentConversationId',
    conversations: 'getConversations',
    friends: 'findFriends',
    me: 'me',
    searchResult: 'search',
    linkStatus: 'linkStatus'
  })
}
</script>

<style lang="scss" scoped>
.navigation {
  background: white;
  border-right: 1px solid $border-color;
  flex: 0 0 18rem;
  display: flex;
  height: 100vh;
  position: relative;
  overflow: hidden;

  .root {
    width: 100%;
    display: flex;
    flex-direction: column;
    .conversations {
      flex: 1;
      height: 100%;
      overflow-x: hidden;
      .active {
        background: #e9ebeb;
      }
      .listheader {
        display: block;
        padding-left: 16px;
        padding-right: 16px;
        padding-top: 3px;
        padding-bottom: 3px;
        color: #8888;
        background: #f5f5f5;
      }
    }
    .header {
      background: #ededed;
      border-bottom: 1px solid #fbfbfb;
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
    border-bottom: 1px solid $border-color;
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
