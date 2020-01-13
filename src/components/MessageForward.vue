<template>
  <transition name="modal">
    <div class="root" @touchmove="notAllowTouchMove($event)" @contextmenu.prevent="dismiss($event)">
      <div class="mask"></div>
      <div class="message-forward">
        <div class="header">
          <svg-icon @click="$emit('close')" icon-class="ic_close" />
          {{$t('chat.share_with')}}
        </div>
        <div class="forward-search">
          <Search @input="onSearch" />
        </div>
        <div class="title">{{showContactTitleFixed ? $t('chat.chat_contact') : $t('chat.recent_chat')}}</div>
        <div class="list">
          <mixin-scrollbar>
            <div class="ul">
              <ChatItem
                v-for="chat in chatList"
                :key="chat.conversationId"
                :chat="chat"
                @item-click="onChatClick"
              ></ChatItem>
              <div class="title" id="contactTitle">{{$t('chat.chat_contact')}}</div>
              <UserItem
                v-for="user in contactList"
                :key="user.user_id"
                :user="user"
                @user-click="onUserClick"
              ></UserItem>
            </div>
          </mixin-scrollbar>
        </div>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

import Search from '@/components/Search.vue'
import UserItem from '@/components/UserItem.vue'
import ChatItem from '@/components/ChatItem.vue'

import { Getter } from 'vuex-class'

@Component({
  components: {
    Search,
    UserItem,
    ChatItem
  }
})
export default class MessageForward extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any

  @Getter('getConversations') conversations: any
  @Getter('findFriends') friends: any

  contacts: any[] = []
  chats: any[] = []
  observer: any
  beforeContactTitleTop: number = 0
  showContactTitleFixed: boolean = false

  notAllowTouchMove(event: any) {
    event.preventDefault()
  }

  onSearch(text: string) {}

  onChatClick() {}
  onUserClick() {}

  mounted() {
    const callback = (entries: any) => {
      entries.forEach((entry: any) => {
        if (entry.boundingClientRect.top < this.beforeContactTitleTop && !entry.isIntersecting) {
          this.showContactTitleFixed = true
        } else {
          this.showContactTitleFixed = false
        }
        this.beforeContactTitleTop = entry.boundingClientRect.top
      })
    }
    this.observer = new IntersectionObserver(callback)
    this.observer.observe(document.getElementById('contactTitle'))
  }
  destroy() {
    this.observer = null
  }

  get chatList() {
    if (this.chats.length) return this.chats
    return this.conversations
  }

  get contactList() {
    if (this.contacts.length) return this.contacts
    return this.friends
  }
}
</script>

<style lang="scss" scoped>
.root {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff55;
}
.message-forward {
  position: relative;
  z-index: 1000;
  width: 28rem;
  padding: 1rem 0;
  max-height: 72vh;
  overflow: hidden;
  list-style: none;
  font-size: 0.875rem;
  background-color: #fff;
  border-radius: 0.25rem;
  border: 1px solid #eee;
  box-shadow: 0 0.3rem 0.8rem rgba(0, 0, 0, 0.195);
  .forward-search {
    width: calc(100% - 4rem);
    margin-left: 1rem;
    input {
      border-radius: 0.2rem;
    }
  }
  .header,
  .title {
    padding: 1rem 1.6rem;
    font-size: 1rem;
    font-weight: 500;
    .svg-icon {
      font-size: 1.45rem;
      cursor: pointer;
    }
  }
  .list {
    height: calc(72vh - 8rem);
  }
}
.modal-enter {
  opacity: 0;
}
.modal-leave-active {
  opacity: 0;
}
.modal-enter .modal-container,
.modal-leave-active .modal-container {
  transform: scale(1.1);
}
</style>
