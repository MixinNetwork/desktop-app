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
  @Prop(Array) readonly contacts: any
  @Prop(Array) readonly mentions: any
  @Prop(Number) readonly height: any

  @Getter('me') me: any

  @Watch('currentUid')
  onCurrentUidChange(currentUid: string) {
    if (currentUid) {
      this.currentUidTemp = currentUid
      this.goItemPos(this.uids.indexOf(currentUid))
      this.mentionHoverPrevent = true
    }
  }

  participants: any[] = []
  currentUidTemp: string = ''
  mentionHoverPrevent: boolean = false

  get uids() {
    const list: any = this.contacts.map((item: any, index: any) => {
      return item.identity_number
    })
    return list
  }

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

  mounted() {}

  beforeDestroy() {
    this.$root.$off('directionKeyDown')
  }

  onUserClick(user: any) {
    this.$emit('choose', this.uids.indexOf(user.identity_number))
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
