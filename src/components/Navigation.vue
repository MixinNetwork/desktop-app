<template>
  <div class="navigation">
    <div class="root">
      <div class="header" :style="{'justify-content': this.isMacOS ? 'flex-end': 'space-between'}">
        <Avatar id="avatar" :user="me" :conversaton="null" @onAvatarClick="showProfile" />
        <div class="action_bar">
          <div id="edit" @click="showConveresation">
            <svg-icon icon-class="ic_edit" />
          </div>
          <Dropdown id="menu" :menus="menus" @onItemClick="onItemClick"></Dropdown>
        </div>
      </div>
      <div class="signal" v-if="linkStatus === LinkStatus.NOT_CONNECTED">
        <svg-icon icon-class="ic_signal" class="signal_icon" />
        <div class="content">
          <label class="title">{{getLinkTitle()}}</label>
          <label class="info">{{getLinkContent()}}</label>
        </div>
      </div>
      <div class="loading-wrapper" v-else-if="linkStatus === LinkStatus.CONNECTING">
        <spinner class="loading" />
        <label style="line-height: 1.9rem">{{getConnectingTitle()}}</label>
      </div>
      <div class="show-more" v-if="showMoreType" @click="showMoreBack">
        <svg-icon icon-class="ic_back" />
        {{ $t({
        contacts: 'chat.chat_contacts',
        chats: 'chat.chat_chats',
        messages: 'chat.chat_messages' }[showMoreType])
        }}
      </div>
      <div class="search-wrapper">
        <Search id="navigationSearch" class="nav" @input="onInput" />
      </div>

      <h5
        v-if="Object.keys(conversations).length === 0 && !searchKeyword && !showMoreType"
      >{{$t('conversation.empty')}}</h5>

      <mixin-scrollbar @scroll="onScroll">
        <div class="conversations ul">
          <ul
            :style="`padding: ${72 * viewport.firstIndex}px 0 ${72 * (conversations.length - viewport.lastIndex - 1)}px 0;`"
            v-if="!showMoreType && conversations && !(searchResult.contact||searchResult.group)"
          >
            <ConversationItem
              v-for="conversation in conversationsVisible"
              :key="conversation.conversationId"
              :conversation="conversation"
              :class="{active:currentConversationId === conversation.conversationId}"
              v-intersect="onIntersect"
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

<script lang="ts">
import ConversationItem from '@/components/ConversationItem.vue'
import Search from '@/components/Search.vue'
import spinner from '@/components/Spinner.vue'
import GroupContainer from '@/components/GroupContainer.vue'
import ProfileContainer from '@/components/ProfileContainer.vue'
import SettingContainer from '@/components/SettingContainer.vue'
import NewConversation from '@/components/NewConversation.vue'
import Dropdown from '@/components/menu/Dropdown.vue'
import Avatar from '@/components/Avatar.vue'
import UserItem from '@/components/UserItem.vue'
import ChatItem from '@/components/ChatItem.vue'
import workerManager from '@/workers/worker_manager'
import { clearDb } from '@/persistence/db_util'
import accountAPI from '@/api/account'
import conversationAPI from '@/api/conversation'
import { ConversationCategory, ConversationStatus, LinkStatus, MuteDuration } from '@/utils/constants'

import { Vue, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component({
  components: {
    ConversationItem,
    Search,
    spinner,
    GroupContainer,
    NewConversation,
    Dropdown,
    Avatar,
    ProfileContainer,
    SettingContainer,
    UserItem,
    ChatItem
  }
})
export default class Navigation extends Vue {
  @Getter('currentConversationId') currentConversationId: any
  @Getter('getConversations') conversations: any
  @Getter('findFriends') friends: any
  @Getter('searching') searching: any
  @Getter('me') me: any
  @Getter('search') searchResult: any
  @Getter('linkStatus') linkStatus: any
  @Getter('currentConversation') conversation: any

  conversationShow: any = false
  groupShow: any = false
  profileShow: any = false
  settingShow: any = false
  menus: any = []
  searchKeyword: any = ''
  showMoreType: any = ''
  inputTimer: any = null
  LinkStatus: any = LinkStatus
  ConversationCategory: any = ConversationCategory
  // @ts-ignore
  isMacOS: any = platform.os.family === 'OS X'
  primaryPlatform: any = localStorage.primaryPlatform
  $moment: any
  $toast: any
  $Dialog: any
  $Menu: any
  $blaze: any
  $t: any

  created() {
    this.menus = this.$t('menu.personal')
    this.$root.$on('directionKeyDownWithCtrl', (direction: string) => {
      const { draftText } = this.conversation
      if (draftText && draftText.trim()) {
        return
      }
      const cLen = this.conversations.length
      if (cLen < 2 || !this.currentConversationId) return
      if (direction === 'up' && this.conversations[0].conversationId !== this.currentConversationId) {
        for (let i = 1; i < cLen; i++) {
          if (this.conversations[i].conversationId === this.currentConversationId) {
            this.onConversationClick(this.conversations[i - 1])
            this.goConversationPos(i - 1)
            break
          }
        }
      }
      if (direction === 'down' && this.conversations[cLen - 1].conversationId !== this.currentConversationId) {
        for (let i = 0; i < cLen - 1; i++) {
          if (this.conversations[i].conversationId === this.currentConversationId) {
            this.onConversationClick(this.conversations[i + 1])
            this.goConversationPos(i + 1)
            break
          }
        }
      }
    })
  }

  beforeDestroy() {
    this.$root.$off('directionKeyDownWithCtrl')
  }

  onItemClick(index: number) {
    if (index === 0) {
      this.groupShow = true
    } else if (index === 1) {
      this.profileShow = true
    } else if (index === 2) {
      this.settingShow = true
    } else if (index === 3) {
      workerManager.stop(this.exit)
    }
  }
  exit() {
    accountAPI.logout().then((resp: any) => {
      this.$blaze.closeBlaze()
      this.$router.push('/sign_in')
      clearDb()
    })
  }
  showMoreBack() {
    this.showMoreType = ''
    this.$store.dispatch('search', {
      keyword: this.searchKeyword
    })
  }
  showMoreList(type: string) {
    this.showMoreType = type
    this.$store.dispatch('search', {
      keyword: this.searchKeyword,
      type: this.showMoreType
    })
  }
  openMenu(conversation: any) {
    const isContact = conversation.category === ConversationCategory.CONTACT
    const isMute = this.isMute(conversation)
    const menu = this.getMenu(isContact, conversation.status === ConversationStatus.QUIT, conversation.pinTime, isMute)
    // @ts-ignore
    this.$Menu.alert(event.clientX, event.clientY, menu, index => {
      const option = menu[index]
      const conversationMenu: any = this.$t('menu.conversation')
      this.handlerMenu(
        Object.keys(conversationMenu).find(key => conversationMenu[key] === option),
        isContact,
        conversation.conversationId,
        conversation.pinTime,
        conversation.ownerId
      )
    })
  }
  openDownMenu(conversation: any, index: number) {
    const isContact = conversation.category === ConversationCategory.CONTACT
    const isMute = this.isMute(conversation)
    const menu = this.getMenu(isContact, conversation.status === ConversationStatus.QUIT, conversation.pinTime, isMute)
    // @ts-ignore
    this.$Menu.alert(event.clientX, event.clientY + 8, menu, index => {
      const option = menu[index]
      const conversationMenu: any = this.$t('menu.conversation')
      this.handlerMenu(
        Object.keys(conversationMenu).find(key => conversationMenu[key] === option),
        isContact,
        conversation.conversationId,
        conversation.pinTime,
        conversation.ownerId
      )
    })
  }
  handlerMenu(position: any, isContact: any, conversationId: any, pinTime: any, ownerId: any) {
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
        (picked: number) => {
          let duration = MuteDuration.HOURS
          if (picked === 0) {
            duration = MuteDuration.HOURS
          } else if (picked === 1) {
            duration = MuteDuration.WEEK
          } else {
            duration = MuteDuration.YEAR
          }
          conversationAPI.mute(conversationId, duration).then((resp: any) => {
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
          conversationAPI.mute(conversationId, 0).then((resp: any) => {
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
  getMenu(isContact: any, isExit: any, pinTime: any, isMute: any) {
    const conversationMenu: any = this.$t('menu.conversation')
    const menu = []
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
  }
  showConveresation(event: any) {
    this.conversationShow = true
  }
  hideConversation() {
    this.conversationShow = false
  }
  showProfile() {
    this.profileShow = true
  }
  hideProfile() {
    this.profileShow = false
  }
  showGroup() {
    this.groupShow = true
  }
  hideGroup() {
    this.groupShow = false
  }
  hideSetting() {
    this.settingShow = false
  }
  onInput(keyword: string) {
    this.searchKeyword = keyword
    let waitTime = 10
    if (this.showMoreType) {
      waitTime = 100
    }
    if (!keyword) {
      this.$store.dispatch('setSearching', '')
      setTimeout(() => {
        let index = 0
        const { conversations, currentConversationId } = this
        for (let i = 0; i < conversations.length; i++) {
          if (conversations[i].conversationId === currentConversationId) {
            index = i
            break
          }
        }
        this.viewport = this.viewportLimit(index - this.threshold, index + this.threshold)
        this.goConversationPos(index)
      }, 100)
    }
    clearTimeout(this.inputTimer)
    this.inputTimer = setTimeout(() => {
      this.$store.dispatch('search', {
        keyword,
        type: this.showMoreType
      })
    }, waitTime)
  }
  success() {
    this.conversationShow = false
    this.groupShow = false
  }
  onConversationClick(conversation: any) {
    if (this.currentConversationId === conversation.conversationId) return
    this.conversationShow = false
    this.$store.dispatch('searchClear')
    this.$store.dispatch('setCurrentConversation', conversation)
  }
  onClickUser(user: any) {
    this.$store.dispatch('searchClear')
    this.$store.dispatch('createUserConversation', {
      user
    })
  }
  onSearchChatClick(conversation: any) {
    this.conversationShow = false
    this.$store.dispatch('setCurrentConversation', conversation)
    let searchKey = ''
    if (conversation.records) {
      searchKey = `key:${this.searchKeyword}`
    }
    this.$store.dispatch('setSearching', searchKey)
    conversation.unseenMessageCount = 0
    setTimeout(() => {
      this.$store.dispatch('markRead', conversation.conversationId)
    }, 100)
  }
  onSearchUserClick(user: any) {
    this.$store.dispatch('setSearching', '')
    this.$store.dispatch('createUserConversation', {
      user
    })
  }
  goConversationPos(index: number) {
    const container: any = document.querySelector('.conversations.ul')
    const item: any = document.querySelector('.conversation.item')
    if (container && item) {
      const itemHeight = item.getBoundingClientRect().height
      const outUp = itemHeight * index <= container.scrollTop
      const outDown = container.clientHeight + container.scrollTop <= itemHeight * (index + 1)
      if (outUp) {
        container.scrollTop = itemHeight * index
      } else if (outDown) {
        container.scrollTop = itemHeight * (index + 1) - container.clientHeight
      }
    }
  }

  get conversationIds() {
    const conversationIds: any = []
    this.conversations.forEach((conv: any) => {
      conversationIds.push(conv.conversationId)
    })
    return conversationIds
  }

  threshold: number = 60
  viewport: any = {
    firstIndex: 0,
    lastIndex: 0
  }
  get conversationsVisible() {
    const list = []
    let { firstIndex, lastIndex } = this.viewport
    if (firstIndex < 0) {
      firstIndex = 0
    }
    if (lastIndex < this.threshold) {
      lastIndex = this.threshold
    }
    for (let i = firstIndex; i < this.conversations.length; i++) {
      if (i >= lastIndex) {
        break
      }
      list.push(this.conversations[i])
    }
    if (this.intersectLock) {
      setTimeout(() => {
        this.intersectLock = false
      }, 200)
    }
    return list
  }

  viewportLimit(index: number, offset: number) {
    let firstIndex = index - offset
    let lastIndex = index + offset
    if (firstIndex < 0) {
      firstIndex = 0
      if (lastIndex < this.viewport.lastIndex) {
        lastIndex = this.viewport.lastIndex
      }
    }
    const cLen = this.conversationIds.length
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
    if (this.intersectLock) return
    const index = this.conversationIds.indexOf(target.id)
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

  scrollDirection: string = ''
  onScroll(obj: any) {
    if (obj) {
      this.scrollDirection = obj.direction
    }
  }

  getLinkTitle() {
    return this.$t('not_connected_title')
  }
  getConnectingTitle() {
    return this.$t('connecting_title')
  }
  getLinkContent() {
    return this.$t('not_connected_content')
  }

  get showIdOrPhoneSearch() {
    // return /^\d{5,15}$/.test(this.searchKeyword)
    return false
  }
}
</script>

<style lang="scss" scoped>
.navigation {
  background: white;
  border-right: 0.05rem solid #dee2e9;
  flex: 0 0 14.4rem;
  display: flex;
  height: 100vh;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  font-size: 0.8rem;
  contain: layout;
  .loading {
    width: 1.2rem;
    height: 1.2rem;
    vertical-align: top;
    margin: 0.3rem 0.3rem 0.3rem 1.15rem;
  }

  .search-wrapper {
    background: #f2f3f3;
    /deep/ .layout {
      background: #fff !important;
    }
    z-index: 10;
    box-shadow: 0 0.05rem 0.05rem #99999933;
  }

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
        padding: 0.8rem 1.25rem 0.45rem;
        font-family: Helvetica;
        font-weight: 500;
        a {
          color: #3d75e3;
          font-size: 0.65rem;
          margin-top: 0.05rem;
          cursor: pointer;
        }
        &:nth-child(5),
        &:nth-child(3) {
          border-top: 0.4rem solid #f2f3f6;
        }
      }

      .listbox {
        padding-bottom: 0.8rem;
      }
    }
    .show-more {
      padding: 0.35rem 0.6rem;
      font-weight: 500;
      background: #f2f3f3;
      cursor: pointer;
      svg {
        margin: 0.2rem 0.35rem 0 0.7rem;
        vertical-align: top;
      }
    }
    .search-id-or-phone {
      text-align: center;
      background: #f2f3f6;
      padding-bottom: 0.4rem;
      & > div {
        padding: 0.6rem 0.6rem 1rem;
        background: #ffffff;
        box-shadow: 0 0.1rem 0.5rem 0 rgba(195, 195, 195, 0.2);
      }
      .search-button {
        background: #3d75e3;
        color: #ffffff;
        border: none;
        font-size: 0.6rem;
        padding: 0.2rem 0.6rem;
        margin-top: 0.4rem;
        cursor: pointer;
        box-shadow: 0 0.4rem 0.55rem 0 rgba(61, 117, 227, 0.3);
        border-radius: 0.6rem;
      }
    }
    .header {
      background: #f2f3f3;
      height: 2.875rem;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding-left: 0.8rem;
      padding-right: 0.8rem;
      justify-content: space-between;

      #avatar {
        width: 2rem;
        height: 2rem;
        margin-right: 1.9rem;
        cursor: pointer;
      }
      .action_bar {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        #edit {
          margin-right: 0.8rem;
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
      padding: 0.5rem;
      align-items: center;
      .signal_icon {
        font-size: 2.4rem;
        flex-shrink: 0;
      }
      .content {
        margin-left: 0.5rem;
        display: flex;
        flex-direction: column;
        .title {
          font-size: 0.75rem;
          font-weight: 500;
        }
        .info {
          font-size: 0.7rem;
          max-lines: 2;
        }
      }
    }
    .loading-wrapper {
      background: #f2f3f3;
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
    padding: 0.35rem 0.6rem;
    display: flex;
    align-items: center;
  }

  .slide-left-enter-active,
  .slide-left-leave-active {
    transition: all 0.3s ease;
  }
  .slide-left-enter,
  .slide-left-leave-to {
    transform: translateX(-100%);
  }
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: all 0.3s ease;
  }
  .slide-right-enter,
  .slide-right-leave-to {
    transform: translateX(200%);
  }
}
</style>
