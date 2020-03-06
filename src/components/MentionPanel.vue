<template>
  <div class="mention-panel" :style="{ height: `${height}rem`}" @click.stop>
    <mixin-scrollbar>
      <div ref="ul" class="ul" @mousemove="mousemove">
        <UserItem
          v-for="user in contacts"
          :key="user.user_id"
          :user="user"
          :keyword="keyword"
          :class="{ current: user.identity_number === currentUidTemp }"
          :style="mentionHoverPrevent ? 'pointer-events: none;' : ''"
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
import { ConversationCategory } from '@/utils/constants'

@Component({
  components: {
    UserItem
  }
})
export default class MentionPanel extends Vue {
  @Prop(String) readonly currentUid: any
  @Prop(String) readonly keyword: any
  @Prop(Object) readonly conversation: any
  @Prop(Array) readonly mentions: any
  @Prop(Number) readonly height: any

  @Getter('me') me: any

  contacts: any[] = []
  participants: any[] = []
  currentUidTemp: string = ''

  @Watch('currentUid')
  onCurrentUidChange(currentUid: string) {
    if (currentUid) {
      this.currentUidTemp = currentUid
    }
  }

  @Watch('keyword')
  onKeywordChanged(keyword: string) {
    const { conversationId, category } = this.conversation
    this.participants = participantDao.getParticipantsByConversationId(conversationId)
    setTimeout(() => {
      if (keyword && this.participants.length > 1 && category === ConversationCategory.GROUP) {
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
        this.$emit('currentSelect', contacts[0])
        this.contacts = contacts
      }
      const ul: any = this.$refs.ul
      ul.scrollTop = 0
    }, 10)
    this.mentionHoverPrevent = true
  }

  mentionHoverPrevent: boolean = false
  mousemove() {
    this.mentionHoverPrevent = false
  }

  goItemPos(index: number) {
    const container: any = document.querySelector('.mention-panel .ul')
    const item: any = document.querySelector('.mention-panel .user-item')
    if (container && item) {
      const itemHeight = item.getBoundingClientRect().height
      const outUp = itemHeight * index <= container.scrollTop
      const outDown = container.clientHeight + container.scrollTop <= itemHeight * (index + 1)
      if (outUp) {
        container.scrollTop = itemHeight * index
      } else if (outDown) {
        container.scrollTop = itemHeight * (index + 1) - container.clientHeight
      }
    }
  }

  mounted() {
    this.$root.$on('directionKeyDown', (direction: string) => {
      const { contacts, currentUidTemp } = this
      let currentIndex = 0
      if (contacts.length) {
        for (let i = 0; i < contacts.length; i++) {
          if (contacts[i].identity_number === currentUidTemp) {
            currentIndex = i
            break
          }
        }
        if (direction === 'up' && currentIndex > 0) {
          const mention = contacts[currentIndex - 1]
          this.currentUidTemp = mention.identity_number
          this.goItemPos(currentIndex - 1)
          this.$emit('currentSelect', mention)
        }
        if (direction === 'down' && currentIndex < contacts.length - 1) {
          const mention = contacts[currentIndex + 1]
          this.currentUidTemp = mention.identity_number
          this.goItemPos(currentIndex + 1)
          this.$emit('currentSelect', mention)
        }
      }
    })
  }

  beforeDestroy() {
    this.$root.$off('directionKeyDown')
  }

  onUserClick(user: any) {
    this.$emit('choose', user)
  }
}
</script>
<style lang="scss" scoped>
.mention-panel {
  contain: layout;
  background: #ffffff;
  border-top: 0.05rem solid #f0f0f0;
  display: flex;
  flex-flow: column nowrap;
  height: 12rem;
  padding-bottom: 0.05rem;
  left: 14.4rem;
  bottom: 2.4rem;
  right: 0;
  position: absolute;
  z-index: 1;
  &.box-message {
    margin-bottom: 2.4rem;
  }
}
</style>
