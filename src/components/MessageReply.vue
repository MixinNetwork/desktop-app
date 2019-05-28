<template>
  <div class="replyContainer">
    <div class="subContainer">
      <header class="title_bar">
        <div @click="$emit('close')">
          <ICClose/>
        </div>
        <div class="title_content">{{$t('menu.chat_operation.1')}}</div>
      </header>
      <search class="nav" @input="onInput"></search>
      <h5 v-if="Object.keys(conversations).length==0">{{$t('conversation.empty')}}</h5>
      <ul class="conversations" v-show="conversations">
        <div>最近联系</div>
        <div
          class="checkbox"
          v-for="(conversation,key,index) in conversations"
          :key="key"
          :index="index"
        >
          <ConversationItem
            :removeMouseEve="true"
            :conversation="conversation"
            :class="{active:currentConversationId === conversation.conversationId}"
            @item-click="onConversationClick"
          >
            <div
              slot="check"
              class="check"
              :class="{'checked':checkedList.some((item)=> item.conversationId === conversation.conversationId)}"
            ></div>
          </ConversationItem>
        </div>
        <div>联系人</div>
        <!-- <div v-for="item in friends" :key="item.user_id">{{item.full_name}}</div> -->
        <!-- <div v-for="user in sub_friends" :key="user.user_id">
          <UserItem :user="user" @user-click="onSearchUserClick"></UserItem>
        </div>-->
      </ul>
      <ul class="conversations">
        <!-- <span
          class="listheader"
          v-show="searchResult.chats && searchResult.chats.length > 0"
        >{{$t('chat.chat_chats')}}</span>-->
        <!-- <div class="checkbox" v-for="chat in searchResult.chats" :key="chat.conversationId">
          <ChatItem :chat="chat" @item-click="onSearchGroupClick(chat)">
            <div
              slot="check"
              class="check"
              :class="{'checked':checkedList.some((item)=> item.conversationId === conversation.conversationId)}"
            ></div>
        </ChatItem>-->
        <!-- </div> -->
        <!-- <span class="listheader">{{$t('chat.chat_contact')}}</span>
        <UserItem
          v-for="user in searchResult.contact"
          :key="user.user_id"
          :user="user"
          @user-click="onSearchUserClick"
        ></UserItem>-->
      </ul>
      <div class="bottom-content" v-show="showEndButton">
        <ICSendReply class="replay-button" @click="sendMessage"/>
        <div class="bottom-list">
          <span v-for="(item,index) in checkedList" :key="item.conversationId">
            {{item.category === "GROUP"? item.groupName : item.name}}
            {{index === checkedList.length-1?'':','}}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import ICClose from '../assets/images/ic_close.svg'
import ICSendReply from '../assets/images/ic_send_reply.svg'
import Search from '@/components/Search.vue'
// import ChatItem from '@/components/ChatItem.vue'
import ConversationItem from '@/components/ConversationItem.vue'
import { mapGetters } from 'vuex'
import userDao from '@/dao/user_dao'
import conversationDao from '@/dao/conversation_dao'
export default {
  name: 'MessageReply',
  data() {
    return {
      msg: '转发列表',
      conversationShow: false,
      checkedList: [],
      showEndButton: false
    }
  },
  components: {
    ICClose,
    // ICVerify,
    ICSendReply,
    Search,
    // UserItem,
    // ChatItem,
    ConversationItem
  },
  methods: {
    handleHideItem() {
      this.$emit('close', '123')
    },
    onInput: function(text) {
      this.$store.dispatch('searchList', {
        text
      })
    },
    onConversationClick: function(conversation) {
      // this.$store.dispatch('searchListClear')
      // this.$store.dispatch('setCurrentConversation', conversation.conversationId)
      // console.log(conversation.conversationId)
      if (conversation.conversationId) {
        var ids = -1
        this.checkedList.forEach((item, index) => {
          if (item.conversationId === conversation.conversationId) {
            ids = index
          }
        })
        if (ids !== -1) {
          this.checkedList.splice(ids, 1)
        } else {
          this.checkedList.push(conversation)
          // this.checkedList.unshift(conversation)
        }
      } else {
        console.log(123)
      }
    },
    sendMessage() {
      console.log(userDao.findFriends())
      console.log(conversationDao.getConversations())
    },
    onSearchGroupClick(conversation) {
      console.log(conversation)
      this.$store.dispatch('searchListClear')
      // this.$store.dispatch('setCurrentConversation', conversation.conversationId)
      this.onConversationClick(conversation)
    },
    onSearchUserClick(conversation) {
      console.log(conversation)
      this.onConversationClick(conversation)
    }
  },
  watch: {
    checkedList(val, old) {
      if (val.length !== 0) {
        this.showEndButton = true
      } else {
        this.showEndButton = false
      }
    }
  },
  computed: {
    ...mapGetters({
      currentConversationId: 'currentConversationId',
      conversations: 'getConversations',
      friends: 'findFriends',
      me: 'me',
      linkStatus: 'linkStatus'
    })
  }
}
</script>
<style lang="scss" scoped>
.replyContainer {
  position: fixed;
  left: 0;
  right: 0;
  height: 100%;
  border-left: 1px solid #e0e0e0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-flow: column nowrap;
  padding: 2rem;
  .subContainer {
    width: 30%;
    min-width: 20rem;
    height: 60%;
    background-color: #fff;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    overflow: hidden;
    box-shadow: -1px -1px 20px -3px #333;
    padding-bottom: 4rem;
    .title_bar {
      background: #ededed;
      height: 3.6rem;
      display: flex;
      align-items: center;
      padding: 0px 16px 0px 16px;
      line-height: 0;
      position: relative;
      .title_content {
        margin-left: 16px;
        font-weight: 500;
        font-size: 16px;
      }
    }
    .conversations {
      overflow: auto;
      -webkit-box-flex: 1;
      -ms-flex: 1 0 0px;
      flex: 1 0 0;
    }
    .bottom-content {
      width: 100%;
      height: 3.6rem;
      background-color: #3a7ee4;
      line-height: 3.6rem;
      position: absolute;
      bottom: 0;
      padding: 0 10px;
      box-sizing: border-box;
      color: #ffffff;
      .bottom-list {
        display: inline-block;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: -webkit-box;
        text-overflow: ellipsis;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
      }
    }
    .checkbox {
      position: relative;
      padding-left: 50px;
      .check {
        position: absolute;
        top: 50%;
        left: 25px;
        width: 20px;
        height: 20px;
        background-color: #fff;
        border: 1px solid #ededed;
        transform: translate(-50%, -50%);
      }
    }
    .checked {
      background-color: #3a7ee4 !important;
      border: 1px solid #3a7ee4 !important;
      &::after {
        position: absolute;
        top: 15%;
        left: 50%;
        width: 12px;
        height: 5px;
        border-left: 2px solid #ffffff;
        border-bottom: 2px solid #ffffff;
        content: '';
        transform: rotate(-45deg) translate(-50%, -50%);
      }
    }
    .replay-button {
      width: 48px;
      height: 48px;
      position: absolute;
      right: 1rem;
      bottom: 2rem;
    }
  }
}
</style>
