<template>
  <div class="delails">
    <header class="titlebar" v-if="!changed">
      <div @click="$emit('close');nameEditing=false">
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
          <span class="name">
            <span v-if="!nameEditing">{{nameEditingVal || name}}</span>
            <div v-else class="inputbox center"><input type="text" v-model="nameEditingVal" required /></div>
            <span @click="editToggle('name')" v-if="profileCanEdit && !editLock">
              <svg-icon v-if="!nameEditing" class="edit" icon-class="ic_edit_pen" style="margin-top: 0.2rem" />
              <svg-icon class="edit" v-else icon-class="ic_edit_check" style="margin-top: 0.25rem" />
            </span>
            <span class="bot-icon">
              <svg-icon icon-class="ic_verify" v-if="user.is_verified" />
              <svg-icon icon-class="ic_robot" v-else-if="user.app_id" />
            </span>
          </span>

          <span class="id" v-if="isContact">Mixin ID: {{user.identity_number || conversation.ownerIdentityNumber}}</span>
          <span class="unblock" v-if="showUnblock" @click="actionUnblock(user.user_id)">
            <small>{{$t('menu.chat.unblock')}}</small>
          </span>
          <span class="add" v-else-if="showAddContact" @click="addContact">
            <span>+</span>
            <small>{{$t('menu.chat.add_contact')}}</small>
          </span>
          <div v-if="!isContact && conversation.category === 'GROUP'" class="announcement">
            <span v-if="!announEditing">
              <span class="gray-text" v-if="!announEditingVal && !conversation.announcement && profileCanEdit">{{$t('group.group_info_edit')}}</span>
              <span v-html="$w(contentUtil.renderUrl(announEditingVal || conversation.announcement))"></span>
            </span>
            <div v-else class="inputbox">
              <pre><span>{{announEditingVal}}</span><br></pre>
              <textarea type="text" v-model="announEditingVal" required />
            </div>
            <span @click="editToggle('announcement')" v-if="profileCanEdit && !editLock">
              <svg-icon v-if="!announEditing" class="edit" icon-class="ic_edit_pen" style="margin-top: 0.1rem" />
              <svg-icon class="edit" v-else icon-class="ic_edit_check" style="margin-top: 0.2rem" />
            </span>
          </div>
          <div v-else class="biography">
            <span v-html="$w(contentUtil.renderUrl(isContact ? user.biography : conversation.biography))"></span>
          </div>
        </header>
        <div class="option" v-if="isContact">
          <a @click="sendMessage">{{$t('chat.send_message')}}</a>
        </div>
        <div class="share option" v-if="isContact">
          <a @click="shareContact">{{$t('chat.share_contact')}}</a>
        </div>
        <div class="participants" v-if="!isContact && details">
          <span class="title">
            {{participantTitle}}
            <span
              class="add"
              v-if="me.role === 'OWNER' && me.role !== 'ADMIN'"
              @click="addParticipant"
            >{{$t('chat.add_participant')}}</span>
          </span>
          <div
            class="participant"
            :class="{'has-menu': getMenu(user)}"
            v-for="user in conversation.participants"
            :key="user.user_id"
          >
            <UserItem
              class="item"
              :user="user"
              :showRole="true"
              @user-click="userClick"
              @show-contextmenu="participantClick"
            ></UserItem>
            <font-awesome-icon
              @click="participantOptionClick(user)"
              icon="chevron-down"
              class="menu"
            />
          </div>
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
import conversationApi from '@/api/conversation'
import userDao from '@/dao/user_dao'
import conversationDao from '@/dao/conversation_dao'

@Component({
  components: {
    Avatar,
    UserItem
  }
})
export default class Details extends Vue {
  @Prop(Object) readonly details: any
  @Prop(Boolean) readonly changed: any

  @Getter('currentConversation') conversation: any

  @Action('createUserConversation') actionCreateUserConversation: any
  @Action('refreshUser') actionRefreshUser: any
  @Action('syncConversation') actionSyncConversation: any
  @Action('unblock') actionUnblock: any
  @Action('setCurrentUser') actionSetCurrentUser: any

  @Action('participantSetAsAdmin') actionParticipantSetAsAdmin: any
  @Action('participantDismissAdmin') actionParticipantDismissAdmin: any
  @Action('participantRemove') actionParticipantRemove: any

  @Watch('details')
  onDetailChanged(val: any) {
    if (val) {
      this.user = this.details
      this.updateView()
    }
  }

  @Watch('nameEditing')
  onNameEditingChanged(val: boolean) {
    if (!val) {
      this.updateConversation(this.nameEditingVal, '')
    } else {
      if (this.editLock) return
      this.announEditing = false
    }
  }

  @Watch('announEditing')
  onAnnounEditingChanged(val: boolean) {
    if (!val) {
      this.updateConversation('', this.announEditingVal)
    } else {
      if (this.editLock) return
      this.nameEditing = false
    }
  }

  contentUtil: any = contentUtil
  $t: any
  $Menu: any
  $toast: any
  nameEditing: boolean = false
  nameEditingVal: string = ''
  announEditing: boolean = false
  announEditingVal: string = ''
  editLock: boolean = false
  user: any = {}

  updateConversation(nameVal: string, announ: string) {
    if (!nameVal && !announ) return
    const { conversationId, ownerId, category, groupName, announcement, createdAt, status, muteUntil } = this.conversation
    const payload: any = {
      name: nameVal || groupName,
      announcement: announ || announcement
    }
    this.editLock = true
    let timeout = setTimeout(() => {
      this.editLock = false
    }, 10000)
    conversationApi.updateConversation(conversationId, payload).then((res) => {
      if (res.data && res.data.data) {
        this.$toast(this.$t('profile.saved'))
        this.conversation.groupName = payload.name
        this.conversation.announcement = payload.announcement
        conversationDao.updateConversation({
          conversation_id: conversationId,
          owner_id: ownerId,
          category,
          name: payload.name,
          announcement: payload.announcement,
          created_at: createdAt,
          status,
          mute_until: muteUntil
        })
      }
      clearTimeout(timeout)
      this.editLock = false
    })
  }

  getMenu(user: any) {
    const participantMenu = this.$t('menu.participant')
    const menu: string[] = []

    const me = this.me
    if (user.user_id === me.user_id) {
      return
    }
    if (user.role !== 'OWNER') {
      if (me.role === 'OWNER') {
        if (user.role === 'ADMIN') {
          menu.push(participantMenu.dismiss_admin)
        } else {
          menu.push(participantMenu.set_as_admin)
        }
      }
      if (me.role === 'OWNER' || (me.role === 'ADMIN' && user.role !== 'ADMIN')) {
        menu.push(participantMenu.remove)
      }
    }
    if (!menu.length) {
      return
    }
    return menu
  }

  userClick(user: any) {
    this.actionCreateUserConversation({
      user
    })
  }

  participantClick(user: any) {
    // this.participantClickAction(user)
  }

  participantOptionClick(user: any) {
    this.participantClickAction(user, 'right')
  }

  participantClickAction(user: any, type?: any) {
    const menu: any = this.getMenu(user)
    if (!menu) return
    const participantMenu = this.$t('menu.participant')
    const { conversationId } = this.conversation

    const rect = this.$el.getBoundingClientRect()
    const e: any = event
    let x = e.clientX
    let y = e.clientY
    if (type === 'right') {
      x = x - 160
    }

    // @ts-ignore
    this.$Menu.alert(x, y, menu, index => {
      const option = menu[index]
      const position = Object.keys(participantMenu).find(key => participantMenu[key] === option)

      if (position === 'profile') {
      } else if (position === 'set_as_admin') {
        this.actionParticipantSetAsAdmin({
          conversationId,
          userId: user.user_id
        }).then(() => {
          user.role = 'ADMIN'
        })
      } else if (position === 'dismiss_admin') {
        this.actionParticipantDismissAdmin({
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

  editToggle(key: string) {
    if (this.editLock) return
    if (key === 'name') {
      if (!this.nameEditing) {
        this.nameEditingVal = this.name
      }
      this.nameEditing = !this.nameEditing
    }
    if (key === 'announcement') {
      if (!this.announEditing) {
        this.announEditingVal = this.conversation.announcement
      }
      this.announEditing = !this.announEditing
    }
  }

  sendMessage() {
    this.$emit('close')
    this.$store.dispatch('createUserConversation', {
      user: this.user
    })
    this.$emit('send-message')
  }

  shareContact() {
    this.$emit('share', this.user)
  }

  addContact() {
    const userId = this.user.user_id
    const { conversationId } = this.conversation
    userApi.updateRelationship({ user_id: userId, full_name: this.user.full_name, action: 'ADD' }).then((res: any) => {
      if (res.data) {
        const user = res.data.data
        this.actionSetCurrentUser(user)
        this.user = user
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

  get profileCanEdit() {
    if (!this.me || !this.user || this.detailUserId) return false
    return this.conversation.category === 'GROUP' && (this.me.role === 'OWNER' || this.user.role === 'ADMIN')
  }

  get showUnblock() {
    if (!this.me || !this.user) return false
    return this.isContact && this.user.relationship === 'BLOCKING' && this.user.user_id !== this.me.user_id
  }

  get showAddContact() {
    if (!this.me || !this.user) return false
    return this.isContact && this.user.relationship !== 'FRIEND' && this.user.user_id !== this.me.user_id
  }

  get participantTitle() {
    const { conversation } = this
    return this.$t('chat.title_participants', { '0': conversation.participants.length })
  }

  get detailUserId() {
    if (!this.user.isCurrent) {
      return this.user.user_id
    }
    return ''
  }

  get name() {
    if (this.detailUserId) {
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
    return this.conversation.category === ConversationCategory.CONTACT || this.detailUserId
  }

  updateView() {
    if (this.isContact) {
      this.actionRefreshUser({
        userId: this.detailUserId || this.conversation.ownerId,
        conversationId: this.conversation.conversationId
      })
    }
    this.actionSyncConversation(this.conversation.conversationId)
  }

  addParticipant() {
    this.$emit('add-participant', true)
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
      .edit {
        cursor: pointer;
        user-select: none;
        opacity: 0.9;
        font-size: 0.8rem;
        margin: 0.15rem -0.8rem 0 0.3rem;
      }
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
        padding: 0 1rem;
        .bot-icon {
          vertical-align: middle;
          padding: 0.2rem;
        }
      }
      .id {
        font-size: 0.8rem;
        font-weight: 300;
        text-align: center;
        width: 100%;
        user-select: text;
      }
      .unblock, .add {
        cursor: pointer;
        color: #3a7ee4;
        font-weight: 400;
        margin-top: 0.8rem;
        padding: 0.15rem 0.65rem;
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
    .option {
      background: white;
      padding: 0.8rem 1rem;
      a {
        font-size: 0.7rem;
        cursor: pointer;
        display: block;
        font-weight: 500;
      }
      margin-top: 0.4rem;
    }
    .share {
      margin-top: 0.05rem;
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
        display: flex;
        justify-content: space-between;
        .add {
          cursor: pointer;
          font-size: 0.7rem;
          line-height: 1.1rem;
        }
      }
      .participant {
        position: relative;
        .item {
          padding-left: 1rem;
          padding-right: 1rem;
          min-height: 2rem;
          height: 2rem;
        }
        .menu {
          position: absolute;
          color: #bbbec3;
          width: 0.7rem;
          height: 0.7rem;
          right: 1rem;
          top: 1.1rem;
          display: none;
          cursor: pointer;
        }
        &.has-menu:hover {
          .menu {
            display: block;
          }
          /deep/ .role {
            display: none;
          }
        }
      }
    }
  }
  .inputbox {
    width: calc(100% - 2rem);
    min-width: 8rem;
    margin-left: 1rem;
    pre, input, textarea {
      line-height: 1.2rem;
      left: 0;
      width: 100%;
    }
  }
}
</style>
