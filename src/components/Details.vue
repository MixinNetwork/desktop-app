<template>
  <div id="delails_root">
    <header class="title_bar">
      <div @click="$emit('close')">
        <ICClose />
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
            v-if="conversation.announcement"
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
          ></UserItem>
        </div>
      </div>
    </mixin-scrollbar>
  </div>
</template>
<script>
import UserItem from '@/components/UserItem.vue'
import ICClose from '@/assets/images/ic_close.svg'
import Avatar from '@/components/Avatar.vue'
import contentUtil from '@/utils/content_util.js'
import { mapGetters } from 'vuex'
import { ConversationCategory } from '@/utils/constants.js'
export default {
  components: {
    ICClose,
    Avatar,
    UserItem
  },
  data() {
    return {
      contentUtil
    }
  },
  computed: {
    participantTitle: function() {
      const { conversation } = this
      return this.$t('chat.title_participants', { '0': conversation.participants.length })
    },
    name: function() {
      const { conversation } = this
      if (conversation.groupName) {
        return conversation.groupName
      } else if (conversation.name) {
        return conversation.name
      } else {
        return null
      }
    },
    isContact: function() {
      return this.conversation.category === ConversationCategory.CONTACT
    },
    ...mapGetters({
      conversation: 'currentConversation',
      user: 'currentUser'
    })
  },
  mounted: async function() {
    if (this.conversation.category === ConversationCategory.CONTACT) {
      this.$store.dispatch('refreshUser', {
        userId: this.conversation.ownerId,
        conversationId: this.conversation.conversationId
      })
    } else {
      this.$store.dispatch('syncConversation', this.conversation.conversationId)
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
    padding: 0px 16px 0px 16px;
    line-height: 0;

    .title_content {
      margin-left: 16px;
      font-weight: 500;
      font-size: 16px;
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
      padding-bottom: 32px;
      padding-left: 32px;
      padding-right: 32px;
      .avatar {
        width: 160px;
        height: 160px;
        margin-top: 32px;
        margin-bottom: 32px;
        font-size: 32px;
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
        padding-left: 16px;
        padding-right: 16px;
        min-height: 40px;
        height: 40px;
      }
    }
  }
}
</style>
