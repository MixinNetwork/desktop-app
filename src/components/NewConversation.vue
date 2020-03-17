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
  background: #f7f7f7;
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
  padding: 3.2rem 0 0 0;
  width: 100%;
  .back {
    padding: 0.8rem;
    cursor: pointer;
  }
  h3 {
    padding: 0;
    margin: 0;
  }
}

.nav {
  border-bottom: 0.05rem solid $border-color;
  padding: 0.35rem 0.6rem;
  display: flex;
  align-items: center;
}

.create {
  background: white;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.2rem 1.1rem;
  cursor: pointer;
  .avatar {
    width: 2.4rem;
    height: 2.4rem;
    margin-right: 0.6rem;
  }
  &:hover,
  &.current {
    background: #f0f0f0;
  }
  border-bottom: 0.05rem solid $border-color;
}
</style>
