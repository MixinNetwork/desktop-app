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
      <Search id="groupContainerSearch" class="nav" @input="onInput" />
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
<script lang="ts">
import Search from '@/components/Search.vue'
import UserItem from '@/components/UserItem.vue'
import UserSelectItem from '@/components/UserSelectItem.vue'

import { Vue, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component({
  components: {
    Search,
    UserItem,
    UserSelectItem
  }
})
export default class GroupContainer extends Vue {
  @Getter('findFriends') readonly friends: any

  slected: any = []
  groupShow: any = false
  title: any = ''
  keyword: any = ''
  $toast: any

  get unSlected() {
    const { friends, slected, keyword } = this
    const result = friends.concat(slected).filter((v: any) => !friends.includes(v) || !slected.includes(v))
    return result.filter((item: any) => {
      if (keyword !== '') {
        return item.full_name.toUpperCase().includes(keyword.toUpperCase())
      }
      return true
    })
  }

  activated() {
    this.slected = []
  }

  onInput(text: string) {
    this.keyword = text
  }
  cancel(user: any) {
    const { slected } = this
    const index = slected.indexOf(user)
    if (index > -1) {
      slected.splice(index, 1)
    }
  }
  onClickUser(user: any) {
    this.slected.push(user)
  }
  showGroup() {
    this.groupShow = true
  }
  hideGroup() {
    this.groupShow = false
  }
  createGroup() {
    const { slected, title } = this
    this.$toast(this.$t('chat.chat_create_group'), 3000)
    this.$store.dispatch('createGroupConversation', {
      groupName: title,
      users: slected
    })
    this.$emit('success')
  }
}
</script>
<style lang="scss" scoped>
main {
  background: $bg-color;
  .group {
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
    .bar {
      padding-top: 2.6rem;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 2.5rem;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        cursor: pointer;
        padding: 0.8rem 0.2rem 0.8rem 1.35rem;
      }
      h3 {
        padding: 0.4rem;
      }
    }
    .nav {
      z-index: 10;
      background: $hover-bg-color;
      border-top: 0.05rem solid $border-color;
      box-shadow: 0 0.05rem 0.05rem #99999933;
      padding: 0.35rem 0.6rem;
      display: flex;
      align-items: center;
    }
    .select_layout {
      background: white;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      padding: 0.8rem;
    }
    .list {
      overflow: auto;
      flex: 1 0 0;
    }
    .create {
      width: 1.4rem;
      height: 1.4rem;
      background: #397ee4;
      color: white;
      padding: 0.6rem;
      border-radius: 1.4rem;
      position: absolute;
      bottom: 3.2rem;
      cursor: pointer;
      left: 0;
      right: 0;
      margin: auto;
      box-shadow: 0 0.15rem 0.3rem rgba(0, 0, 0, 0.16), 0 0.15rem 0.3rem rgba(0, 0, 0, 0.23);
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
      margin-top: 5rem;
      margin-left: 0.8rem;
      input {
        font-size: 0.8rem;
        border: none;
        background: transparent;
        border-bottom: 0.1rem solid #397ee4;
      }
      input:focus {
        outline: none;
      }

      label {
        color: #999;
        font-size: 0.8rem;
        font-weight: normal;
        position: absolute;
        pointer-events: none;
        color: #8a8a8a;
        left: 0.6rem;
        top: 0.6rem;
        transition: 0.2s ease all;
      }

      input:focus ~ label,
      input:valid ~ label {
        top: -0.6rem;
        font-size: 0.6rem;
        color: #8d8d8d;
      }
    }
    .create {
      width: 1.4rem;
      height: 1.4rem;
      background: #397ee4;
      cursor: pointer;
      color: white;
      padding: 0.6rem;
      border-radius: 1.4rem;
      position: absolute;
      bottom: 3.2rem;
      left: 0;
      right: 0;
      margin: auto;
      box-shadow: 0 0.15rem 0.3rem rgba(0, 0, 0, 0.16), 0 0.15rem 0.3rem rgba(0, 0, 0, 0.23);
    }
  }
  #group {
    width: 100%;
    height: 100%;
    display: flex;
    flex-flow: column nowrap;
    background: $bg-color;
    .bar {
      padding-top: 2.6rem;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 2.5rem;
      color: white;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        cursor: pointer;
        padding: 0.8rem 0.2rem 0.8rem 1rem;
      }
      h3 {
        padding: 0.4rem;
      }
    }
    input {
      padding: 0.4rem;
      margin: 0.6rem;
    }
  }
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: all 0.3s ease;
  }
  .slide-right-enter,
  .slide-right-leave-to {
    transform: translateX(200%);
  }
}
</style>
