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
          <span class="header-name">{{optionName === 'edit' ? circleName : 'Circles'}}</span>
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
          <div class="edit" v-if="optionName === 'edit'">
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
                  <div class="ul">
                    <div class="title">{{i18n.t('chat.recent_chat')}}</div>
                    <div v-for="chat in chats" :key="chat.conversationId">
                      <ChatItem :chat="chat" @item-click="onChatClick"></ChatItem>
                    </div>
                    <div class="title">{{i18n.t('chat.chat_contact')}}</div>
                    <div v-for="user in contacts" :key="user.user_id">
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

          <mixin-scrollbar v-else>
            <div class="ul">
              <div
                v-for="item in circles"
                :key="item.circleId"
                class="circle-item"
                @click="editCircle(item)"
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
                    <span class="edit" @click.stop="editCircle(item)">Edit</span>
                    <span class="delete" @click.stop="deleteCircle(item.circleId)">Delete</span>
                  </div>
                </div>
              </div>
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
  optionName: string = 'list'

  chats: any = []
  contacts: any = []

  $Dialog: any
  $goConversationPos: any
  i18n: any = i18n

  @Watch('visible')
  onVisibleChanged(val: boolean) {
    if (val) {
      this.optionName = 'list'
      // TODO get
      this.circles = [{ circleId: 'c1', name: 'Circle Demo', conversations: 0, unreadNum: 1 }]
    }
  }

  @Watch('searchName')
  onSearchNameChanged(val: string) {
    this.onSearch(val)
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

  saveCircle() {
    let currentIndex = -1
    for (let i = 0; i < this.circles.length; i++) {
      if (this.circles[i].circleId === this.currentCircle.circleId) {
        currentIndex = i
        break
      }
    }
    if (currentIndex < 0) {
      this.circles.unshift(this.currentCircle)
    } else {
      this.circles[currentIndex] = this.currentCircle
    }
    this.optionName = 'list'
  }

  inputFocus() {
    setTimeout(() => {
      if (this.$refs.input) {
        // @ts-ignore
        this.$refs.input.focus()
      }
    }, 300)
  }

  editCircle(circle: any) {
    this.currentCircle = circle
    this.searchName = ''
    this.onSearch('')
    this.inputFocus()
    const { circleId, name } = circle
    // TODO get circleDetail
    this.optionName = 'edit'
    this.circleName = name
  }

  onSearch(keyword: string) {
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
          if (item.circleId === circleId) {
            index = i
          }
        })
        this.circles.splice(index, 1)
      },
      i18n.t('cancel'),
      () => {}
    )
  }

  createCircleAction() {
    if (!this.cirlceName) return
    const payload = { name: this.cirlceName }
    circleApi.createCircle(payload).then(res => {
      console.log(res)
    })
    this.currentCircle = payload
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
.edit {
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
