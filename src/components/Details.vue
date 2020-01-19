<template>
  <div id="delails_root">
    <header class="title_bar">
      <div @click="$emit('close')">
        <svg-icon style="font-size: 1.5rem" icon-class="ic_close" />
      </div>
      <div class="title_content">{{$t('profile.title')}}</div>
    </header>
    <mixin-scrollbar>
      <div class="ul content">
        <header class="content_header">
          <div>
            <Avatar class="avatar" :user="user" :conversation="conversation" />
          </div>
          <span class="name">{{name}}</span>
          <span class="id" v-if="isContact">Mixin ID: {{conversation.ownerIdentityNumber}}</span>
          <div
            v-if="conversation.category === 'GROUP'"
            class="announcement"
            v-html="contentUtil.renderUrl(conversation.announcement)"
          ></div>
          <div v-else-if="conversation.biography" class="biography">{{conversation.biography}}</div>
        </header>
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
import { Vue, Prop, Component } from 'vue-property-decorator'
import {
  Getter,
  Action
} from 'vuex-class'

import UserItem from '@/components/UserItem.vue'
import Avatar from '@/components/Avatar.vue'
import contentUtil from '@/utils/content_util'
import { ConversationCategory } from '@/utils/constants'

@Component({
  components: {
    Avatar,
    UserItem
  }
})
export default class Details extends Vue {
  @Getter('currentConversation') conversation: any
  @Getter('currentUser') user: any

  @Action('createUserConversation') actionCreateUserConversation: any
  @Action('refreshUser') actionRefreshUser: any
  @Action('syncConversation') actionSyncConversation: any

  @Action('participantSetAsAdmin') actionParticipantSetAsAdmin: any
  @Action('participantRemove') actionParticipantRemove: any

  contentUtil: any = contentUtil
  $t: any
  $Menu: any

  participantClick(user: any) {
    const participantMenu = this.$t('menu.participant')
    const menu: string[] = []

    // @ts-ignore
    const account = JSON.parse(localStorage.getItem('account'))
    if (user.user_id === account.user_id || user.role === 'OWNER') {
      return
    }

    // menu.push(participantMenu.profile)
    const { participants, conversationId } = this.conversation
    const me = participants.filter((item: any) => {
      return item.user_id === account.user_id
    })[0]
    menu.push(participantMenu.send_message)
    if (me.role === 'OWNER' && user.role !== 'ADMIN') {
      menu.push(participantMenu.set_as_admin)
    }
    if (['OWNER', 'ADMIN'].indexOf(me.role) > -1) {
      menu.push(participantMenu.remove)
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

  get participantTitle() {
    const { conversation } = this
    return this.$t('chat.title_participants', { '0': conversation.participants.length })
  }

  get name() {
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
    return this.conversation.category === ConversationCategory.CONTACT
  }

  mounted() {
    if (this.conversation.category === ConversationCategory.CONTACT) {
      this.actionRefreshUser({
        userId: this.conversation.ownerId,
        conversationId: this.conversation.conversationId
      })
    } else {
      this.actionSyncConversation(this.conversation.conversationId)
    }
  }
}
</script>
<style lang="scss" scoped>
#delails_root {
  background: #f5f7fa;
  display: flex;
  flex-flow: column nowrap;
  .title_bar {
    background: #ffffff;
    height: 3.6rem;
    display: flex;
    align-items: center;
    padding: 0px 1rem 0px 1rem;
    line-height: 0;

    .title_content {
      margin-left: 1rem;
      font-weight: 500;
      font-size: 1rem;
    }
  }
  .content {
    display: flex;
    flex: 1;
    overflow: auto;
    flex-flow: column nowrap;
    .content_header {
      background: white;
      display: flex;
      align-items: center;
      flex-flow: column nowrap;
      padding-bottom: 2rem;
      padding-left: 2rem;
      padding-right: 2rem;
      .avatar {
        width: 10rem;
        height: 10rem;
        margin-top: 2rem;
        margin-bottom: 2rem;
        font-size: 4rem;
      }
      .name {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        user-select: text;
      }
      .id {
        font-size: 1rem;
        font-weight: 300;
        text-align: center;
        width: 100%;
        user-select: text;
      }
    }
    .announcement,
    .biography {
      word-break: break-all;
      margin-top: 1rem;
      font-weight: 400;
      font-size: 0.95rem;
      user-select: text;
    }
    .participants {
      margin-top: 1rem;
      background: white;
      display: flex;
      flex: 1;
      flex-direction: column;
      .title {
        padding: 1rem;
        color: #3a7ee4;
        font-weight: 500;
      }
      .participant {
        padding-left: 1rem;
        padding-right: 1rem;
        min-height: 2.5rem;
        height: 2.5rem;
      }
    }
  }
}
</style>
