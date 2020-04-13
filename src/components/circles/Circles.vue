<template>
  <transition name="modal">
    <div class="root" v-if="visible">
      <div class="bg"></div>
      <div class="circles">
        <div class="header">
          <svg-icon
            v-if="optionName === 'edit'"
            class="go-back"
            @click="back"
            icon-class="ic_back"
          />
          <svg-icon v-else style="font-size: 1.2rem" @click="close" icon-class="ic_close" />
          <span class="header-name" v-if="optionName === 'list'">Circles</span>
          <span class="header-name" v-else>
            <span>{{circleName}}</span>
          </span>
          <svg-icon
            v-if="optionName === 'list'"
            style="font-size: 1.15rem; float: right"
            @click="createCircle"
            icon-class="ic_add"
          />
          <a
            v-else-if="optionName === 'edit' && !currentCircle"
            class="save"
            :class="{disabled: !cirlceName}"
            @click="createCircleAction"
          >Next</a>
          <a v-else-if="optionName === 'edit'" class="save" @click="saveCircle">Save</a>
        </div>

        <div class="list">
          <div v-if="optionName === 'before-edit'">
            <button
              class="edit-button"
              v-if="currentCircle"
              @click="editCircleName"
            >Edit Circle Name</button>
            <button class="edit-button" v-if="currentCircle" @click="editCircle">Edit Conversations</button>
          </div>

          <div :class="optionName" v-else-if="optionName === 'edit' || optionName === 'view'">
            <div v-if="currentCircle">
              <div class="input-wrapper">
                <input
                  class="input"
                  ref="input"
                  type="text"
                  placeholder="Search name"
                  v-model="searchName"
                  required
                />
              </div>
              <div class="circle">
                <mixin-scrollbar>
                  <div class="ul" ref="ul">
                    <div class="title">{{i18n.t('chat.chats')}}</div>
                    <div class="item" v-for="chat in chatList" :key="chat.conversationId">
                      <svg-icon
                        v-if="optionName === 'edit'"
                        @click.stop="choiceClick(chat.conversationId, 'conversation_id')"
                        :icon-class="selectedIndex(chat.conversationId, 'conversation_id') > -1?'ic_choice_selected':'ic_choice'"
                        :class="{selected: selectedIndex(chat.conversationId, 'conversation_id') > -1}"
                        class="choice-icon"
                      />
                      <ChatItem :chat="chat" @item-click="onChatClick"></ChatItem>
                    </div>
                    <div class="title">{{i18n.t('chat.chat_contact')}}</div>
                    <div class="item" v-for="user in contactList" :key="user.user_id">
                      <svg-icon
                        v-if="optionName === 'edit'"
                        @click.stop="choiceClick(user.user_id, 'contact_id')"
                        :icon-class="selectedIndex(user.user_id, 'contact_id') > -1?'ic_choice_selected':'ic_choice'"
                        :class="{selected: selectedIndex(user.user_id, 'contact_id') > -1}"
                        class="choice-icon"
                      />
                      <UserItem :user="user" @user-click="onUserClick"></UserItem>
                    </div>
                  </div>
                </mixin-scrollbar>
              </div>
            </div>
            <div class="input-wrapper" v-else>
              <input
                class="input"
                ref="input"
                type="text"
                placeholder="Circle Name"
                v-model="cirlceName"
                required
              />
            </div>
          </div>

          <mixin-scrollbar v-else-if="circles.length">
            <div class="ul" ref="ul">
              <div
                v-for="item in circles"
                :key="item.circle_id"
                class="circle-item"
                @click="viewCircle(item)"
              >
                <div class="avatar">
                  <svg-icon icon-class="ic_circles" class="circles-icon" />
                </div>
                <div class="content">
                  <div class="name">
                    <span>{{item.name}}</span>
                    <div
                      class="desc"
                    >{{i18n.t('chat.conversations', { '0': item.conversations || 0 })}}</div>
                  </div>
                  <div class="badge" v-if="item.unreadNum">
                    <span class="num">{{item.unreadNum}}</span>
                  </div>
                  <div class="options">
                    <span class="edit" @click.stop="beforeEditCircle(item)">Edit</span>
                    <span class="delete" @click.stop="deleteCircle(item.circle_id)">Delete</span>
                  </div>
                </div>
              </div>
            </div>
          </mixin-scrollbar>

          <div
            class="empty"
            v-else
          >Create circles for different groups of chats and quickly switch between them</div>
        </div>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator'
import store from '@/store/store'

import circleApi from '@/api/circle'
import i18n from '@/utils/i18n'
import conversationDao from '@/dao/conversation_dao'
import userDao from '@/dao/user_dao'
import participantDao from '@/dao/participant_dao'
import circleDao from '@/dao/circle_dao'
import circleConversationDao from '@/dao/circle_conversation_dao'
import { ConversationCategory } from '@/utils/constants'

import UserItem from '@/components/UserItem.vue'
import ChatItem from '@/components/ChatItem.vue'

@Component({
  components: {
    UserItem,
    ChatItem
  }
})
export default class Circles extends Vue {
  visible: boolean = false

  currentCircle: any = null
  cirlceName: string = ''
  searchName: string = ''
  circles: any = []
  circleName: string = ''
  optionName: string = ''

  chats: any = []
  contacts: any = []
  selectedList: any = []

  $Dialog: any
  $toast: any
  $goConversationPos: any
  i18n: any = i18n

  @Watch('visible')
  onVisibleChanged(val: boolean) {
    if (val) {
      this.optionName = 'list'
    }
  }

  @Watch('optionName')
  onOptionNameChanged(val: string) {
    if (val === 'list') {
      this.circles = circleDao.findAllCircles()
    }
  }

  @Watch('searchName')
  onSearchNameChanged(val: string) {
    this.onSearch(val)
    const ul: any = this.$refs.ul
    ul.scrollTop = 0
  }

  get chatList() {
    if (this.chats.length || this.searchName) return this.chats
    return store.getters.getConversations
  }

  get contactList() {
    if (this.contacts.length || this.searchName) return this.contacts
    return store.getters.findFriends
  }

  onChatClick(conversation: any) {
    this.visible = false

    store.dispatch('setCurrentConversation', conversation)
    this.$goConversationPos('current')
    setTimeout(() => {
      store.dispatch('markRead', conversation.conversationId)
    }, 100)
  }

  onUserClick(user: any) {
    this.visible = false
    store.dispatch('createUserConversation', {
      user
    })
    this.$goConversationPos('current')
  }

  close() {
    if (this.optionName === 'list') {
      this.visible = false
    } else {
      this.optionName = 'list'
    }
  }

  back() {
    this.optionName = 'list'
  }

  createCircle() {
    this.currentCircle = null
    this.circleName = 'New circle'
    this.optionName = 'edit'
    this.cirlceName = ''
    this.inputFocus()
  }

  selectedIndex(id: string, type: string) {
    let index = -1
    for (let i = 0; i < this.selectedList.length; i++) {
      const currentId = this.selectedList[i]
      if (this.selectedList[i][type] === id) {
        index = i
        break
      }
    }
    return index
  }

  choiceClick(id: string, type: string) {
    const index = this.selectedIndex(id, type)
    if (index > -1) {
      this.selectedList.splice(index, 1)
    } else {
      const item: any = {}
      item[type] = id
      this.selectedList.unshift(item)
    }
  }

  editCircleName() {
    // circleApi.updateCircle(circleId, this.currentCircle).then(res => {
    //   console.log('---', res)
    // })
  }

  saveCircle() {
    let currentIndex = -1
    const circleId = this.currentCircle.circle_id

    for (let i = 0; i < this.circles.length; i++) {
      if (this.circles[i].circle_id === circleId) {
        currentIndex = i
        break
      }
    }
    if (currentIndex < 0) {
      this.circles.unshift(this.currentCircle)
    } else {
      this.circles[currentIndex] = this.currentCircle
    }

    circleApi.updateCircleConversations(circleId, this.selectedList).then(res => {
      if (res.data) {
        const list: any = []
        res.data.data.forEach((item: any) => {
          list.push({
            circle_id: item.circle_id,
            conversation_id: item.conversation_id,
            created_at: item.created_at,
            pin_time: ''
          })
        })
        circleConversationDao.insertUpdate(list)
        this.optionName = 'list'
        this.$toast(i18n.t('chat.circle_saved'), 3000)
      }
    })
  }

  inputFocus() {
    setTimeout(() => {
      if (this.$refs.input) {
        // @ts-ignore
        this.$refs.input.focus()
      }
    }, 300)
  }

  viewCircle(circle: any) {
    this.currentCircle = circle
    this.searchName = ''
    const circleId = circle.circle_id
    this.selectedList = circleConversationDao.findCircleConversationByCircleId(circleId)
    this.inputFocus()
    this.optionName = 'view'
    this.circleName = circle.name
  }

  beforeEditCircle(circle: any) {
    this.currentCircle = circle
    this.optionName = 'before-edit'
  }

  editCircle() {
    this.searchName = ''
    const circleId = this.currentCircle.circle_id
    this.selectedList = circleConversationDao.findCircleConversationByCircleId(circleId)
    this.inputFocus()
    this.optionName = 'edit'
    this.circleName = this.currentCircle.name
  }

  onSearch(keyword: string) {
    if (!keyword) {
      this.chats = []
      this.contacts = []
      return
    }
    const chats = conversationDao.fuzzySearchConversation(keyword)
    chats.forEach((item: any, index: number) => {
      const participants = participantDao.getParticipantsByConversationId(item.conversationId)
      chats[index].participants = participants
    })
    this.chats = [...chats]
    const contacts = userDao.fuzzySearchUser(keyword).filter((item: any) => {
      if (!chats) return []
      return !chats.some((conversation: any) => {
        return conversation.category === ConversationCategory.CONTACT && conversation.ownerId === item.user_id
      })
    })
    this.contacts = [...contacts]
  }

  deleteCircle(circleId: string) {
    this.$Dialog.alert(
      i18n.t('chat.remove_circle'),
      i18n.t('ok'),
      () => {
        let index = -1
        this.circles.forEach((item: any, i: number) => {
          if (item.circle_id === circleId) {
            index = i
          }
        })
        circleApi.deleteCircle(circleId).then(res => {
          circleDao.deleteCircleById(circleId)
          this.circles.splice(index, 1)
        })
      },
      i18n.t('cancel'),
      () => {}
    )
  }

  createCircleAction() {
    if (!this.cirlceName) return
    const payload: any = { name: this.cirlceName }
    circleApi.createCircle(payload).then(res => {
      if (res.data) {
        const data = res.data.data
        payload.circleId = data.circle_id
        this.currentCircle = payload
        circleDao.insert({
          circle_id: data.circle_id,
          name: data.name,
          created_at: data.created_at,
          order_at: ''
        })
      }
    })
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
  user-select: text;
}
.bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #33333377;
}
.circles {
  position: relative;
  z-index: 1000;
  width: 22.4rem;
  padding-top: 0.2rem;
  max-height: 72vh;
  overflow: hidden;
  list-style: none;
  font-size: 0.8rem;
  background-color: #fff;
  border-radius: 0.2rem;
  box-shadow: 0 0.2rem 0.6rem rgba(0, 0, 0, 0.195);
  .header,
  .title {
    padding: 0.8rem 1.25rem;
    font-size: 0.8rem;
    font-weight: 500;
    line-height: 1.2rem;
    .svg-icon {
      font-size: 1.45rem;
      cursor: pointer;
    }
    .save {
      float: right;
      cursor: pointer;
      user-select: none;
      &.disabled {
        opacity: 0.5;
      }
    }
    .go-back {
      font-size: 0.8rem;
      margin-top: 0.2rem;
      padding: 0 0.2rem;
    }
    .header-name {
      padding: 0 0.5rem;
      user-select: none;
    }
  }
  .list {
    font-size: 0.8rem;
    height: calc(72vh - 6.4rem);
    .circle-item {
      display: flex;
      user-select: none;
      padding: 0.6rem 1.25rem;
      align-items: center;
      cursor: pointer;
      &:hover {
        background: $hover-bg-color;
        .content {
          .options {
            display: flex;
          }
          .badge {
            display: none;
          }
        }
      }
      .avatar {
        border-radius: 2rem;
        width: 2rem;
        height: 2rem;
        background: #aaaaaa33;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 0.6rem;
        /deep/ .circles-icon {
          font-size: 0.9rem;
          margin-top: -0.05rem;
          stroke: #2f3032;
        }
      }

      .content {
        flex: 1;
        display: flex;
        justify-content: space-between;
        .name {
          flex: 1;
          .desc {
            font-size: 0.7rem;
            color: #aaa;
          }
        }
        .badge {
          display: flex;
          align-items: center;
          .num {
            background: $primary-color;
            border-radius: 0.6rem;
            box-sizing: border-box;
            color: white;
            font-size: 0.5rem;
            padding: 0.15rem 0.35rem;
          }
        }
        .options {
          display: none;
          align-items: center;
          span {
            margin: 0 0.1rem;
            font-size: 0.7rem;
            padding: 0.1rem 0.3rem;
            border-radius: 0.1rem;
          }
          .edit {
            background: $primary-color;
            color: #fff;
          }
          .delete {
            background: $danger-color;
            color: #fff;
          }
        }
      }
    }
  }
}
.edit-button {
  display: block;
  margin: 0 auto 0.4rem;
  width: 80%;
  border: none;
  background: $primary-color;
  cursor: pointer;
  color: white;
  border-radius: 0.1rem;
  font-size: 0.7rem;
  padding: 0.3rem;
}
.empty {
  color: #b8bdc7;
  text-align: center;
  font-size: 0.7rem;
  line-height: 1.2rem;
  padding: 1.25rem 4rem;
}
.edit,
.view {
  .input-wrapper {
    padding: 0.4rem 1.25rem;
  }
  .input {
    padding: 0.5rem 1rem;
    box-sizing: border-box;
    border: none;
    border-radius: 1rem;
    background: #f5f7fa;
    font-size: 0.7rem;
    width: 100%;
  }
  .circle {
    height: calc(72vh - 9rem);
    user-select: none;
    .item {
      position: relative;
      li {
        padding-left: 3rem;
      }
      .choice-icon {
        position: absolute;
        cursor: pointer;
        z-index: 10;
        left: 1rem;
        top: 1rem;
        font-size: 1.6rem;
        &.selected {
          top: 1.1rem;
        }
      }
    }
  }
}
.view {
  .circle .item li {
    padding-left: 1.2rem;
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
