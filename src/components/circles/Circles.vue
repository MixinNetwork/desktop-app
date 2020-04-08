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
          <span class="header-name" v-if="optionName === 'list'">{{i18n.t('circle.circles')}}</span>
          <span class="header-name" v-else>
            <span>{{currentCircle && currentCircle.name || i18n.t('circle.new_circle')}}</span>
            <div
              class="desc"
              v-if="optionName === 'edit'"
            >{{i18n.t('circle.conversations', { '0': selectedList.length || currentCircle.count || 0 })}}</div>
          </span>
          <svg-icon
            v-if="optionName === 'list'"
            style="font-size: 1.15rem; float: right"
            @click="createCircle"
            icon-class="ic_add"
          />
          <a
            v-else-if="optionName === 'circle-name'"
            class="save"
            :class="{disabled: !circleName}"
            @click="createCircleAction"
          >{{i18n.t(`circle.${!currentCircle?'next':'save'}`)}}</a>
          <a
            v-else-if="optionName === 'edit'"
            class="save"
            @click="saveCircle"
          >{{i18n.t('circle.save')}}</a>
        </div>

        <div class="list">
          <div class="before-edit" v-if="optionName === 'before-edit'">
            <button
              class="edit-button"
              v-if="currentCircle"
              @click="editCircleName"
            >{{i18n.t('circle.edit_circle_name')}}</button>
            <button
              class="edit-button"
              v-if="currentCircle"
              @click="editCircle"
            >{{i18n.t('circle.edit_converstaions')}}</button>
          </div>

          <div class="input-wrapper" v-else-if="optionName === 'circle-name'">
            <input
              class="input"
              ref="input"
              type="text"
              placeholder="Circle Name"
              v-model="circleName"
              required
            />
          </div>

          <div class="edit" v-else-if="optionName === 'edit'">
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
            <div class="selected-preview" v-if="!searchName && selectedAvatarList.length">
              <div class="in">
                <div
                  class="selected-avatar"
                  v-for="item in selectedAvatarList"
                  :key="item.conversationId"
                >
                  <Avatar class="avatar" v-if="item.user_id" :user="item" />
                  <Avatar class="avatar" v-else :conversation="item" />
                  <svg-icon class="close" @click="unselected(item)" icon-class="ic_circle_close" />
                  <span class="name">{{item.groupName || item.name || item.full_name}}</span>
                </div>
              </div>
            </div>
            <div class="circle">
              <mixin-scrollbar>
                <div class="ul" ref="ul">
                  <div class="title" v-if="chatList.length">{{i18n.t('chat.chats')}}</div>
                  <div class="item" v-for="chat in chatList" :key="chat.conversationId">
                    <svg-icon
                      v-if="optionName === 'edit'"
                      @click.stop="choiceClick(chat, 'conversation_id')"
                      :icon-class="selectedIndex(chat.conversationId, 'conversation_id') > -1?'ic_choice_selected':'ic_choice'"
                      :class="{selected: selectedIndex(chat.conversationId, 'conversation_id') > -1}"
                      class="choice-icon"
                    />
                    <ChatItem :chat="chat" @item-click="onChatClick"></ChatItem>
                  </div>
                  <div class="title" v-if="contactList.length">{{i18n.t('chat.chat_contact')}}</div>
                  <div class="item" v-for="user in contactList" :key="user.user_id">
                    <svg-icon
                      v-if="optionName === 'edit'"
                      @click.stop="choiceClick(user, 'user_id')"
                      :icon-class="selectedIndex(user.user_id, 'user_id') > -1?'ic_choice_selected':'ic_choice'"
                      :class="{selected: selectedIndex(user.user_id, 'user_id') > -1}"
                      class="choice-icon"
                    />
                    <UserItem :user="user" @user-click="onUserClick"></UserItem>
                  </div>
                </div>
              </mixin-scrollbar>
            </div>
          </div>

          <mixin-scrollbar v-else-if="optionName === 'list'">
            <div class="ul" ref="ul">
              <div
                v-for="item in circles"
                :key="item.circle_id"
                class="circle-item"
                @click="viewCircle(item)"
              >
                <div class="avatar">
                  <svg-icon
                    icon-class="ic_circles"
                    class="circles-icon"
                    :style="{stroke: circleColor(item.circle_id)}"
                  />
                </div>
                <div class="content">
                  <div class="name">
                    <span>{{item.name}}</span>
                    <div
                      class="desc"
                      v-if="item.circle_id === 'mixin'"
                    >{{i18n.t('circle.all_conversations')}}</div>
                    <div
                      class="desc"
                      v-else
                    >{{i18n.t('circle.conversations', { '0': item.count || 0 })}}</div>
                  </div>
                  <div
                    class="checked"
                    :class="{normal: selectedCurrentCircle}"
                    v-if="(!selectedCurrentCircle ? 'mixin' : selectedCurrentCircle.circle_id) === item.circle_id"
                  >
                    <svg-icon icon-class="ic_circle_checked" class="circle-checked" />
                  </div>
                  <div class="badge" v-else-if="item.unseen_message_count">
                    <span class="num">{{item.unseen_message_count}}</span>
                  </div>
                  <div class="options" v-if="item.circle_id !== 'mixin'">
                    <span
                      class="edit-button"
                      @click.stop="beforeEditCircle(item)"
                    >{{i18n.t('circle.edit')}}</span>
                    <span
                      class="delete-button"
                      @click.stop="deleteCircle(item.circle_id)"
                    >{{i18n.t('circle.delete')}}</span>
                  </div>
                </div>
              </div>

              <div class="empty" v-if="circles.length === 1" v-html="i18n.t('circle.empty')"></div>
            </div>
          </mixin-scrollbar>
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
import { getNameColorById, generateConversationId } from '@/utils/util'

import UserItem from '@/components/UserItem.vue'
import ChatItem from '@/components/ChatItem.vue'
import Avatar from '@/components/Avatar.vue'

@Component({
  components: {
    UserItem,
    ChatItem,
    Avatar
  }
})
export default class Circles extends Vue {
  visible: boolean = false

  currentCircle: any = null
  searchName: string = ''
  circles: any = []
  circleName: string = ''
  optionName: string = ''

  chats: any = []
  contacts: any = []
  selectedList: any = []
  circleConversations: any = []

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
      const circles = circleDao.findAllCircleItem()
      circles.unshift({
        name: 'Mixin',
        circle_id: 'mixin'
      })
      this.circles = circles
    }
  }

  @Watch('searchName')
  onSearchNameChanged(val: string) {
    this.onSearch(val)
    const ul: any = this.$refs.ul
    if (!ul) return
    ul.scrollTop = 0
  }

  get chatList() {
    if (this.chats.length || this.searchName) return this.chats
    return store.getters.getConversations
  }

  get contactList() {
    const exsitIds: any = []
    store.getters.getConversations.forEach((item: any) => {
      if (item.participants.length === 2) {
        exsitIds.push(item.participants[0].user_id)
        exsitIds.push(item.participants[1].user_id)
      }
    })
    let result = []
    if (this.contacts.length || this.searchName) {
      result = this.contacts
    } else {
      result = store.getters.findFriends
    }
    const list: any = []
    result.forEach((item: any) => {
      if (exsitIds.indexOf(item.user_id) < 0) {
        list.push(item)
      }
    })
    return list
  }

  get selectedCurrentCircle() {
    return store.getters.currentCircle
  }

  get selectedAvatarList() {
    const cidList: any = []
    const uidList: any = []
    this.selectedList.forEach((item: any) => {
      if (item.user_id) {
        uidList.push(item.user_id)
      } else {
        cidList.push(item.conversation_id)
      }
    })
    const list: any = []
    this.chatList.forEach((item: any) => {
      if (cidList.indexOf(item.conversationId) > -1) {
        list.push(item)
      }
    })
    this.contactList.forEach((item: any) => {
      if (uidList.indexOf(item.user_id) > -1) {
        list.push(item)
      }
    })
    return list
  }

  unselected(target: any) {
    let type = 'conversation_id'
    if (target.user_id) {
      type = 'user_id'
    }
    this.choiceClick(target, type)
  }

  onChatClick(conversation: any) {
    this.visible = false

    store.dispatch('setCurrentConversation', conversation)
    this.$goConversationPos('current')
    setTimeout(() => {
      store.dispatch('markRead', conversation.conversationId)
    }, 100)
  }

  circleColor(id: string) {
    if (id === 'mixin') {
      return '#2f3032'
    }
    return getNameColorById(id)
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
    this.selectedList = []
    this.circleName = ''
    this.optionName = 'circle-name'
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

  choiceClick(target: any, type: string) {
    const item: any = {}
    let id = target.conversationId
    if (type === 'user_id') {
      id = target.user_id
    } else {
      item.conversation_id = id
    }
    const index = this.selectedIndex(id, type)
    if (index > -1) {
      this.selectedList.splice(index, 1)
    } else {
      if (type === 'user_id') {
        // @ts-ignore
        const account = JSON.parse(localStorage.getItem('account'))
        const conversationId = generateConversationId(account.user_id, id)
        item.conversation_id = conversationId
        item.user_id = target.user_id
      }
      this.selectedList.unshift(item)
    }
  }

  editCircleName() {
    this.optionName = 'circle-name'
    this.circleName = this.currentCircle.name
    this.inputFocus()
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
    const userIdMap: any = {}
    const selectedList: any = []
    this.selectedList.forEach((item: any) => {
      userIdMap[item.conversation_id] = item.user_id
      const temp: any = {
        conversation_id: item.conversation_id
      }
      if (item.user_id) {
        temp.user_id = item.user_id
      }
      if (item.part_user_id) {
        temp.user_id = item.part_user_id
      }
      selectedList.push(temp)
    })
    circleApi.updateCircleConversations(circleId, selectedList).then(res => {
      const list: any = []
      if (!res.data || !res.data.data) return
      res.data.data.forEach((item: any) => {
        list.push({
          circle_id: item.circle_id,
          conversation_id: item.conversation_id,
          created_at: item.created_at,
          user_id: userIdMap[item.conversation_id],
          pin_time: ''
        })
      })
      circleConversationDao.deleteByCircleId(circleId)
      circleConversationDao.insert(list)
      this.optionName = 'list'
      this.$toast(i18n.t('circle.saved'), 3000)
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
    if (circle.circle_id === 'mixin') {
      store.dispatch('setCurrentCircle', null)
      this.visible = false
      return
    }
    store.dispatch('setCurrentCircle', circle)
    this.visible = false
  }

  beforeEditCircle(circle: any) {
    this.currentCircle = circle
    this.optionName = 'before-edit'
  }

  editCircle() {
    this.searchName = ''
    this.selectedList = circleConversationDao.findCircleConversationByCircleId(this.currentCircle.circle_id)
    this.inputFocus()
    this.optionName = 'edit'
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
      i18n.t('circle.remove'),
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
    if (!this.circleName) return
    const payload: any = { name: this.circleName }
    if (this.currentCircle) {
      circleApi.updateCircle(this.currentCircle.circle_id, payload).then(res => {
        if (!res.data || !res.data.data) return
        const data = res.data.data
        circleDao.insert({
          circle_id: data.circle_id,
          name: data.name,
          created_at: data.created_at,
          ordered_at: ''
        })
        this.optionName = 'list'
      })
      return
    }
    circleApi.createCircle(payload).then(res => {
      if (!res.data || !res.data.data) return
      const data = res.data.data
      this.currentCircle = data
      circleDao.insert({
        circle_id: data.circle_id,
        name: data.name,
        created_at: data.created_at,
        ordered_at: ''
      })
      this.optionName = 'edit'
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
  user-select: none;
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
      display: inline-flex;
      line-height: 0.8rem;
      padding: 0 0.5rem;
      .desc {
        font-size: 0.65rem;
        margin-left: 0.5rem;
        line-height: 1rem;
        color: #aaa;
        font-weight: normal;
      }
    }
  }
  .list {
    font-size: 0.8rem;
    height: calc(72vh - 6.4rem);
    .circle-item {
      display: flex;
      padding: 0.6rem 1.25rem;
      align-items: center;
      cursor: pointer;
      &:hover {
        background: $hover-bg-color;
        .content {
          .options {
            display: flex;
          }
          .badge,
          .checked.normal {
            display: none;
          }
        }
      }
      .avatar {
        border-radius: 2rem;
        width: 2rem;
        height: 2rem;
        background: #cccccc33;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 0.6rem;
        .circles-icon {
          font-size: 0.9rem;
          margin-top: -0.05rem;
          stroke: #2f3032;
        }
      }
      .circle-checked {
        font-size: 1rem;
        margin-top: 0.5rem;
        margin-right: 0.05rem;
      }

      .content {
        flex: 1;
        display: flex;
        justify-content: space-between;
        .name {
          flex: 1;
          .desc {
            font-size: 0.65rem;
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
            white-space: nowrap;
            text-align: center;
          }
          .edit-button {
            background: $primary-color;
            color: #fff;
          }
          .delete-button {
            background: $danger-color;
            color: #fff;
          }
        }
      }
    }
  }
}

.before-edit {
  padding: 0.4rem 0;
}
.edit-button {
  display: block;
  margin: 0 auto 0.6rem;
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
.input-wrapper {
  padding: 0.4rem 1.25rem;
}
* {
  ::-webkit-scrollbar {
    width: 0.35rem;
    height: 0.35rem;
    background: transparent;
  }
  ::-webkit-scrollbar-track-piece,
  ::-webkit-scrollbar-corner {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 0.25rem;
    width: 0.35rem;
    background: #11111133;
    cursor: pointer;
  }
}
.selected-preview {
  user-select: none;
  width: 100%;
  box-sizing: border-box;
  overflow-x: scroll;
  overflow-y: hidden;
  height: 6rem;
  padding: 0.4rem 1.25rem;

  .in {
    white-space: nowrap;
  }
  .selected-avatar {
    position: relative;
    display: inline-flex;
    width: 2.4rem;
    height: 3.4rem;
    margin-right: 0.6rem;
    padding-right: 0.3rem;
    .close {
      position: absolute;
      right: 0;
      top: 0;
      z-index: 9999;
      cursor: pointer;
    }
    .avatar {
      width: 2.4rem;
      height: 2.4rem;
    }
    .name {
      text-align: center;
      font-size: 0.6rem;
      position: absolute;
      bottom: 0;
      left: -0.3rem;
      width: 3rem;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
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
.edit {
  display: flex;
  flex-direction: column;
  height: 100%;
  user-select: none;
  .circle {
    height: 100%;
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
