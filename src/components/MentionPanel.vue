<template>
  <div class="mention-panel" :style="{ height: `${height}rem`}" @click.stop>
    <mixin-scrollbar>
      <div ref="ul" class="ul">
        <UserItem
          v-for="user in contacts"
          :key="user.user_id"
          :user="user"
          :keyword="keyword"
          @user-click="onUserClick"
        ></UserItem>
      </div>
    </mixin-scrollbar>
  </div>
</template>
<script lang="ts">
import participantDao from '@/dao/participant_dao'

import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

import UserItem from '@/components/UserItem.vue'

@Component({
  components: {
    UserItem
  }
})
export default class MentionPanel extends Vue {
  @Prop(String) readonly keyword: any
  @Prop(Object) readonly conversation: any
  @Prop(Array) readonly mentions: any
  @Prop(Number) readonly height: any

  @Getter('me') me: any

  contacts: any[] = []
  participants: any[] = []

  @Watch('keyword')
  onKeywordChanged(keyword: string) {
    const { conversationId } = this.conversation
    this.participants = participantDao.getParticipantsByConversationId(conversationId)
    setTimeout(() => {
      if (keyword && this.participants.length > 2) {
        let contacts: any = []
        const mentionIds: any = []
        this.mentions.forEach((item: any) => {
          mentionIds.push(item.identity_number)
        })
        this.participants.forEach(item => {
          if (item.identity_number !== this.me.identity_number && mentionIds.indexOf(item.identity_number) < 0) {
            if (
              keyword === '@' ||
              `@${item.identity_number}`.startsWith(keyword) ||
              `@${item.full_name.toLowerCase()}`.startsWith(keyword.toLowerCase())
            ) {
              contacts.push(item)
            }
          }
        })
        this.$emit('update', contacts)
        this.contacts = contacts
      }
      const ul: any = this.$refs.ul
      ul.scrollTop = 0
    }, 10)
  }

  onUserClick(user: any) {
    this.$emit('choose', user)
  }
}
</script>
<style lang="scss" scoped>
.mention-panel {
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-flow: column nowrap;
  height: 15rem;
  padding-bottom: 0.1rem;
  left: 18rem;
  bottom: 3rem;
  right: 0;
  position: absolute;
  z-index: 1;
}
</style>
