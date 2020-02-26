<template>
  <div class="mention-panel" @click.stop>
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
import userDao from '@/dao/user_dao'

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

  contacts: any[] = []

  @Watch('keyword')
  onKeyworChanged(keyword: string) {
    setTimeout(() => {
      const contacts = userDao.fuzzySearchUser(keyword).filter((item: any) => {
        return true
      })
      this.contacts = contacts
      this.$emit('update', contacts)
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
  height: 15.1rem;
  left: 18rem;
  bottom: 3rem;
  right: 0;
  position: absolute;
  z-index: 1;
}
</style>
