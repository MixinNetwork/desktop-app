<template>
  <main>
    <div class="group">
      <div class="bar">
        <font-awesome-icon class="back" icon="arrow-left" @click="$emit('back')" />
        <h3>{{$t('group.group_add')}}</h3>
      </div>
      <div class="select_layout" v-if="slected && slected.length>0">
        <UserSelectItem
          v-for="(user,index) in slected"
          :key="user.id"
          :index="index"
          :user="user"
          @user-click-a="cancel"
        ></UserSelectItem>
      </div>
      <search class="nav" @input="onInput"></search>
      <mixin-scrollbar>
        <ul class="list">
          <UserItem
            v-for="(user,key) in unSlected"
            :key="key"
            :user="user"
            @user-click="onClickUser"
          ></UserItem>
        </ul>
      </mixin-scrollbar>
      <font-awesome-icon
        class="create"
        icon="arrow-right"
        v-if="slected && slected.length>0"
        @click="showGroup"
      />
    </div>
    <transition name="slide-right">
      <div class="overlay" id="group" v-if="groupShow">
        <div class="bar">
          <font-awesome-icon class="back" icon="arrow-left" @click="hideGroup" />
          <h3>{{$t('group.group_new_title')}}</h3>
        </div>
        <div class="inputbox">
          <input type="text" v-model="title" required />
          <label>{{$t('group.group_new_name')}}</label>
        </div>
        <font-awesome-icon
          class="create"
          icon="arrow-right"
          v-if="title.length>0"
          @click="createGroup"
        />
      </div>
    </transition>
  </main>
</template>
<script>
import Search from '@/components/Search.vue'
import UserItem from '@/components/UserItem.vue'
import UserSelectItem from '@/components/UserSelectItem.vue'
import { mapGetters } from 'vuex'
export default {
  name: 'group',
  components: { Search, UserItem, UserSelectItem },
  data: function() {
    return {
      slected: [],
      groupShow: false,
      title: '',
      keyword: ''
    }
  },
  computed: {
    unSlected: function() {
      const { friends, slected, keyword } = this
      const result = friends.concat(slected).filter(v => !friends.includes(v) || !slected.includes(v))
      return result.filter(item => {
        if (keyword !== '') {
          return item.full_name.toUpperCase().includes(keyword.toUpperCase())
        }
        return true
      })
    },
    ...mapGetters({ friends: 'findFriends' })
  },
  activated: function() {
    this.slected = []
  },
  methods: {
    onInput: function(text) {
      this.keyword = text
    },
    cancel: function(user) {
      const { slected } = this
      var index = slected.indexOf(user)
      if (index > -1) {
        slected.splice(index, 1)
      }
    },
    onClickUser: function(user) {
      this.slected.push(user)
    },
    showGroup: function() {
      this.groupShow = true
    },
    hideGroup: function() {
      this.groupShow = false
    },
    createGroup: function() {
      const { slected, title } = this
      this.$toast(this.$t('chat.chat_create_group'), 3000)
      this.$store.dispatch('createGroupConversation', {
        groupName: title,
        users: slected
      })
      this.$emit('success')
    }
  }
}
</script>
<style lang="scss" scoped>
main {
  background: #f5f7fa;
  .group {
    display: flex;
    flex-flow: column nowrap;
    height: 100vh;
    .bar {
      padding-top: 60px;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 60px;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        padding: 16px;
      }
      h3 {
        padding: 8px;
      }
    }
    .nav {
      border-bottom: 1px solid $border-color;
      padding: 0.45rem 0.75rem;
      display: flex;
      align-items: center;
    }
    .select_layout {
      background: white;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      padding: 16px;
    }
    .list {
      overflow: auto;
      flex: 1 0 0;
    }
    .create {
      width: 28px;
      height: 28px;
      background: #397ee4;
      color: white;
      padding: 12px;
      border-radius: 28px;
      position: absolute;
      bottom: 64px;
      cursor: pointer;
      left: 0;
      right: 0;
      margin: auto;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
    }
  }
  .overlay {
    z-index: 10;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    top: 0;
    left: 0;
    .inputbox {
      position: relative;
      margin-top: 100px;
      margin-left: 16px;
      input {
        font-size: 16px;
        border: none;
        background: transparent;
        border-bottom: 2px solid #2cbda5;
      }
      input:focus {
        outline: none;
      }

      label {
        color: #999;
        font-size: 16px;
        font-weight: normal;
        position: absolute;
        pointer-events: none;
        color: #8a8a8a;
        left: 10px;
        top: 10px;
        transition: 0.2s ease all;
      }

      input:focus ~ label,
      input:valid ~ label {
        top: -12px;
        font-size: 12px;
        color: #8d8d8d;
      }
    }
    .create {
      width: 28px;
      height: 28px;
      background: #397ee4;
      cursor: pointer;
      color: white;
      padding: 12px;
      border-radius: 28px;
      position: absolute;
      bottom: 64px;
      left: 0;
      right: 0;
      margin: auto;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
    }
  }
  #group {
    width: 100%;
    height: 100%;
    display: flex;
    flex-flow: column nowrap;
    background: #f5f7fa;
    .bar {
      padding-top: 60px;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 60px;
      color: white;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        padding: 16px;
      }
      h3 {
        padding: 8px;
      }
    }
    input {
      padding: 8px;
      margin: 10px;
    }
  }
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: all 0.3s;
  }
  .slide-right-enter,
  .slide-right-leave-to {
    transform: translateX(200%);
  }
}
</style>
