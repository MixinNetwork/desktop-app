<template>
  <div id="create">
    <div class="bar">
      <font-awesome-icon class="back" icon="arrow-left" @click="$emit('conversation-back')"/>
      <h3>{{$t('chat.new_conversation')}}</h3>
    </div>
    <Search class="nav" @input="onInput"/>
    <div class="create" @click="$emit('newGroup')">
      <img src="../assets/logo.png" class="avatar">
      <h3>{{$t('group.group_new_title')}}</h3>
    </div>
    <ul class="list">
      <UserItem
        v-for="user in currentFriends"
        :key="user.user_id"
        :user="user"
        @user-click="$emit('user-click',user)"
      />
    </ul>
  </div>
</template>
<script>
import UserItem from '@/components/UserItem.vue'
import Search from '@/components/Search.vue'
import { mapGetters } from 'vuex'
export default {
  name: 'NewConversation',
  data: function() {
    return {
      keyword: ''
    }
  },
  components: {
    UserItem,
    Search
  },
  methods: {
    onInput: function(text) {
      this.keyword = text
    }
  },
  computed: {
    currentFriends: function() {
      const { keyword, friends } = this
      return friends.filter(item => {
        if (keyword !== '') {
          return item.full_name.toUpperCase().includes(keyword.toUpperCase())
        }
        return true
      })
    },
    ...mapGetters({
      friends: 'findFriends'
    })
  }
}
</script>
<style lang="scss" scoped>
#create {
  background: #f6f6f6;
  display: flex;
  flex-direction: column;
  .list {
    overflow: auto;
    flex: 1 0 0;
  }
}

.bar {
  background: #2cbda5;
  color: white;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4rem 0 0 0;
  width: 100%;
  .back {
    padding: 1rem;
  }
  h3 {
    padding: 0;
    margin: 0;
  }
}

.nav {
  border-bottom: 1px solid #f2f2f2;
  padding: 0.45rem 0.75rem;
  display: flex;
  align-items: center;
}

.create {
  background: white;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.5rem 0;
  .avatar {
    width: 3rem;
    height: 3rem;
    margin: 0 1rem;
  }
  &:hover,
  &.current {
    background: #f1f2f2;
  }
  border-bottom: 1px solid #f2f2f2;
}
</style>
