<template>
  <div id="create">
    <div class="bar">
      <font-awesome-icon class="back" icon="arrow-left" @click="$emit('conversation-back')" />
      <h3>{{$t('chat.new_conversation')}}</h3>
    </div>
    <Search id="newConversationSearch" class="nav" @input="onInput" />
    <div class="create" @click="$emit('newGroup')">
      <img src="../assets/logo.png" class="avatar" />
      <h3>{{$t('group.group_new_title')}}</h3>
    </div>
    <mixin-scrollbar>
      <ul class="list">
        <UserItem
          v-for="user in currentFriends"
          :key="user.user_id"
          :user="user"
          @user-click="$emit('user-click',user)"
        />
      </ul>
    </mixin-scrollbar>
  </div>
</template>
<script lang="ts">
import UserItem from '@/components/UserItem.vue'
import Search from '@/components/Search.vue'
import accountApi from '@/api/account'

import { Vue, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component({
  components: {
    UserItem,
    Search
  }
})
export default class NewConversation extends Vue {
  @Getter('findFriends') friends: any

  keyword: string = ''

  onInput(text: string) {
    this.keyword = text
  }

  mounted() {
    accountApi.getFriends().then(
      (resp: any) => {
        const friends = resp.data.data
        if (friends && friends.length > 0) {
          this.$store.dispatch('refreshFriends', friends)
        }
      },
      (err: any) => {
        console.log(err)
      }
    )
  }
  get currentFriends() {
    const { keyword, friends } = this
    return friends.filter((item: any) => {
      if (keyword !== '') {
        return item.full_name.toUpperCase().includes(keyword.toUpperCase())
      }
      return true
    })
  }
}
</script>
<style lang="scss" scoped>
#create {
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  .list {
    overflow: auto;
    flex: 1 0 0;
  }
}

.bar {
  background: #ffffff;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4rem 0 0 0;
  width: 100%;
  .back {
    padding: 1rem;
    cursor: pointer;
  }
  h3 {
    padding: 0;
    margin: 0;
  }
}

.nav {
  border-bottom: 1px solid $border-color;
  padding: 0.45rem 0.75rem;
  display: flex;
  align-items: center;
}

.create {
  background: white;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.3rem 1.4rem;
  cursor: pointer;
  .avatar {
    width: 3rem;
    height: 3rem;
    margin-right: 0.8rem;
  }
  &:hover,
  &.current {
    background: #f1f2f2;
  }
  border-bottom: 1px solid $border-color;
}
</style>
