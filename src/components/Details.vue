<template>
  <div class="delails">
    <header class="titlebar" v-if="!changed">
      <div @click="$emit('close')">
        <svg-icon style="font-size: 1.2rem; cursor: pointer" icon-class="ic_close" />
      </div>
      <div class="title-content">{{$t('profile.title')}}</div>
    </header>
    <mixin-scrollbar v-if="!changed">
      <div class="ul content">
        <header class="content-header">
          <div>
            <Avatar v-if="isContact" class="avatar" :user="user" />
            <Avatar v-else class="avatar" :conversation="conversation" />
          </div>
          <span class="name">{{name}}</span>
          <span class="id" v-if="isContact">Mixin ID: {{userId || conversation.ownerIdentityNumber}}</span>
          <span class="add" v-if="showAddContact" @click="addContact">
            <span>+</span>
            <small>{{$t('menu.chat.add_contact')}}</small>
          </span>
          <div
            v-if="!isContact && conversation.category === 'GROUP'"
            class="announcement"
            v-html="$w(contentUtil.renderUrl(conversation.announcement))"
          ></div>
          <div v-else-if="isContact" class="biography" v-html="$w(user.biography)"></div>
          <div v-else class="biography" v-html="$w(conversation.biography)"></div>
        </header>
        <div class="share" v-if="isContact">
          <a @click="shareContact">{{$t('chat.share_contact')}}</a>
        </div>
        <div class="participants" v-if="!isContact">
          <span class="title">{{participantTitle}}</span>
          <UserItem
            class="participant"
            v-for="user in conversation.participants"
            :key="user.user_id"
            :user="user"
            :showRole="true"
            @user-click="participantClick"
          ></UserItem>
        </div>
      </div>
    </mixin-scrollbar>
  </div>
</template>

<script lang="ts">
import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'

import UserItem from '@/components/UserItem.vue'
import Avatar from '@/components/Avatar.vue'
import contentUtil from '@/utils/content_util'
import { getAccount } from '@/utils/util'
import { ConversationCategory } from '@/utils/constants'
import userApi from '@/api/user'
import userDao from '@/dao/user_dao'

@Component({
  components: {
    Avatar,
    UserItem
  }
})
export default class Details extends Vue {
  @Prop(String) readonly userId: any
  @Prop(Boolean) readonly details: any
  @Prop(Boolean) readonly changed: any

  @Getter('currentConversation') conversation: any
  @Getter('currentUser') user: any

  @Action('createUserConversation') actionCreateUserConversation: any
  @Action('refreshUser') actionRefreshUser: any
  @Action('setCurrentUser') actionSetCurrentUser: any
  @Action('syncConversation') actionSyncConversation: any

  @Action('participantSetAsAdmin') actionParticipantSetAsAdmin: any
  @Action('participantRemove') actionParticipantRemove: any

  @Watch('details')
  onDetailChanged(val: boolean) {
    if (val) {
      this.updateView()
    }
  }

  contentUtil: any = contentUtil
  $t: any
  $Menu: any

  participantClick(user: any) {
    const participantMenu = this.$t('menu.participant')
    const menu: string[] = []

    const { conversationId } = this.conversation
    const me = this.me
    if (user.user_id === me.user_id) {
      return
    }
    menu.push(participantMenu.send_message)
    if (user.role !== 'OWNER') {
      if (me.role === 'OWNER' && user.role !== 'ADMIN') {
        menu.push(participantMenu.set_as_admin)
      }
      if (me.role === 'OWNER' || (me.role === 'ADMIN' && user.role !== 'ADMIN')) {
        menu.push(participantMenu.remove)
      }
    }

    // @ts-ignore
    this.$Menu.alert(event.clientX, event.clientY, menu, index => {
      const option = menu[index]
      const position = Object.keys(participantMenu).find(key => participantMenu[key] === option)

      if (position === 'send_message') {
        this.actionCreateUserConversation({
          user
        })
      } else if (position === 'profile') {
      } else if (position === 'set_as_admin') {
        this.actionParticipantSetAsAdmin({
          conversationId,
          userId: user.user_id
        })
      } else if (position === 'remove') {
        this.actionParticipantRemove({
          conversationId,
          userId: user.user_id
        })
      }
    })
  }

  shareContact() {
    this.$emit('share', this.user)
  }

  addContact() {
    const userId = this.user.user_id
    const { conversationId } = this.conversation
    userApi.updateRelationship({ user_id: userId, full_name: this.user.full_name, action: 'ADD' }).then((res: any) => {
      if (res.data) {
        this.actionSetCurrentUser(res.data.data)
      }
    })
  }

  get me() {
    const account: any = getAccount()
    const { participants, conversationId } = this.conversation
    return participants.filter((item: any) => {
      return item.user_id === account.user_id
    })[0]
  }

  get showAddContact() {
    return this.isContact && this.user.relationship !== 'FRIEND' && this.user.user_id !== this.me.user_id
  }

  get participantTitle() {
    const { conversation } = this
    return this.$t('chat.title_participants', { '0': conversation.participants.length })
  }

  get name() {
    if (this.userId) {
      return this.user.full_name
    }
    const { conversation } = this
    if (conversation.groupName) {
      return conversation.groupName
    } else if (conversation.name) {
      return conversation.name
    } else {
      return null
    }
  }

  get isContact() {
    return this.conversation.category === ConversationCategory.CONTACT || this.userId
  }

  updateView() {
    if (this.isContact) {
      this.actionRefreshUser({
        userId: this.userId || this.conversation.ownerId,
        conversationId: this.conversation.conversationId
      })
      if (this.userId) {
        const user = userDao.findUserByIdentityNumber(this.userId)
        this.actionSetCurrentUser(user)
      }
    }
    this.actionSyncConversation(this.conversation.conversationId)
  }
  mounted() {
    this.updateView()
  }
}
</script>
<style lang="scss" scoped>
.delails {
  contain: layout;
  background: $bg-color;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  z-index: 9999;
  .titlebar {
    background: #ffffff;
    height: 2.85rem;
    display: flex;
    align-items: center;
    padding: 0 0.8rem 0 0.8rem;
    line-height: 0;

    .title-content {
      margin-left: 0.8rem;
      font-weight: 500;
      font-size: 0.8rem;
    }
  }
  .content {
    display: flex;
    flex: 1;
    overflow: auto;
    flex-flow: column nowrap;
    .content-header {
      background: white;
      display: flex;
      align-items: center;
      flex-flow: column nowrap;
      padding: 0 1rem 1.6rem;
      .avatar {
        width: 8rem;
        height: 8rem;
        margin-top: 1.6rem;
        margin-bottom: 1.6rem;
        font-size: 3.2rem;
      }
      .name {
        font-size: 0.95rem;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        user-select: text;
      }
      .id {
        font-size: 0.8rem;
        font-weight: 300;
        text-align: center;
        width: 100%;
        user-select: text;
      }
      .add {
        cursor: pointer;
        color: #3a7ee4;
        font-weight: 400;
        margin-top: 0.8rem;
        padding: 0.15rem 0.45rem;
        background: #f2f2f2;
        border-radius: 0.8rem;
      }
    }
    .announcement,
    .biography {
      word-break: break-all;
      margin-top: 0.4rem;
      font-weight: 400;
      font-size: 0.75rem;
      user-select: text;
    }
    .share {
      background: white;
      margin-top: 0.4rem;
      padding: 0.8rem 1rem;
      a {
        cursor: pointer;
        display: block;
        font-weight: 500;
      }
    }
    .participants {
      margin-top: 0.4rem;
      background: white;
      display: flex;
      flex: 1;
      flex-direction: column;
      font-size: 0.8rem;
      .title {
        padding: 0.8rem 1rem;
        color: #3a7ee4;
        font-weight: 500;
      }
      .participant {
        padding-left: 1rem;
        padding-right: 1rem;
        min-height: 2rem;
        height: 2rem;
      }
    }
  }
}
</style>
