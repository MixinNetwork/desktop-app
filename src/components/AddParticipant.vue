<template>
  <transition name="modal">
    <div class="root">
      <div class="mask"></div>
      <div class="add-participant">
        <div class="header">
          <div>
            <svg-icon style="font-size: 1.2rem" @click="$emit('close')" icon-class="ic_close" />
            {{$t('chat.add_participant')}}
            <span>{{selectedList.length - beforeSelected.length || ''}}</span>
          </div>
          <a class="add-done" @click="addDone">{{$t('chat.add_participant_done')}}</a>
        </div>
        <div class="contact-search">
          <Search id="addParticipantSearch" @input="onSearch" :autofocus="true" />
        </div>
        <div class="selected-preview" v-if="!keyword && selectedContactList.length">
          <div class="in">
            <div class="selected-avatar" v-for="item in selectedContactList" :key="item.user_id">
              <Avatar class="avatar" v-if="item.user_id" :user="item" />
              <svg-icon
                class="close"
                @click="choiceClick(item.user_id)"
                icon-class="ic_circle_close"
              />
              <span class="name">{{item.full_name}}</span>
            </div>
          </div>
        </div>
        <div class="title">{{$t('chat.chat_contact')}}</div>
        <div class="list">
          <mixin-scrollbar>
            <div class="ul" ref="ul">
              <div
                class="item"
                v-for="user in contactList"
                :key="user.user_id"
                @click.stop="choiceClick(user.user_id)"
                :class="{'before-selected': beforeSelected.indexOf(user.user_id) > -1}"
              >
                <svg-icon
                  :icon-class="selectedList.indexOf(user.user_id) > -1 ? 'ic_choice_selected' : 'ic_choice'"
                  :class="{selected: selectedList.indexOf(user.user_id) > -1}"
                  class="choice-icon"
                />
                <UserItem :keyword="keyword" :user="user"></UserItem>
              </div>
            </div>
          </mixin-scrollbar>
        </div>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

import Search from '@/components/Search.vue'
import UserItem from '@/components/UserItem.vue'
import Avatar from '@/components/Avatar.vue'

import userDao from '@/dao/user_dao'
import participantDao from '@/dao/participant_dao'

import { Getter, Action } from 'vuex-class'

@Component({
  components: {
    Search,
    UserItem,
    Avatar
  }
})
export default class AddParticipant extends Vue {
  @Prop(Array) readonly participants: any

  @Getter('findFriends') friends: any

  contacts: any[] = []
  keyword: string = ''
  hasEscKeyListener: boolean = false
  selectedList: any = []
  beforeSelected: any = []
  $toast: any

  mounted() {
    this.participants.forEach((item: any) => {
      this.beforeSelected.push(item.user_id)
    })
    this.selectedList = JSON.parse(JSON.stringify(this.beforeSelected))
  }

  onSearch(keyword: string) {
    this.keyword = keyword
    if (!this.keyword) {
      setTimeout(() => {
        if (!this.hasEscKeyListener) {
          this.hasEscKeyListener = true
          this.$root.$on('escKeydown', () => {
            this.$emit('close')
          })
        }
      }, 500)
      this.contacts = []
      return
    } else {
      this.hasEscKeyListener = false
      this.$root.$off('escKeydown')
    }

    const contacts = userDao.fuzzySearchUser(keyword)
    this.contacts = [...contacts]
    const ul: any = this.$refs.ul
    ul.scrollTop = 0
  }

  choiceClick(id: any) {
    const index = this.selectedList.indexOf(id)
    if (index > -1) {
      this.selectedList.splice(index, 1)
      return
    }
    this.selectedList.unshift(id)
  }

  addDone() {
    this.$emit('done', this.selectedContactList)
  }

  beforeDestroy() {
    this.$root.$off('escKeydown')
  }

  get selectedContactList() {
    const list: any = []
    this.contactList.forEach((item: any) => {
      if (this.selectedList.indexOf(item.user_id) > -1 && this.beforeSelected.indexOf(item.user_id) < 0) {
        list.push(item)
      }
    })
    return list
  }

  get contactList() {
    if (this.contacts.length || this.keyword) return this.contacts
    return this.friends
  }
}
</script>

<style lang="scss" scoped>
.root {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #33333377;
}
.add-participant {
  position: relative;
  z-index: 1000;
  width: 22.4rem;
  padding: 0.2rem 0 0.8rem;
  max-height: 72vh;
  overflow: hidden;
  list-style: none;
  font-size: 0.8rem;
  background-color: #fff;
  border-radius: 0.2rem;
  box-shadow: 0 0.2rem 0.6rem rgba(0, 0, 0, 0.195);
  .contact-search {
    padding-left: 0.8rem;
    padding-right: 0.8rem;
    input {
      border-radius: 0.2rem;
    }
    /deep/ .layout {
      background: $hover-bg-color;
    }
  }
  .header,
  .title {
    padding: 0.8rem 1.25rem;
    font-size: 0.8rem;
    font-weight: 500;
    line-height: 1.1rem;
    display: flex;
    justify-content: space-between;
    .svg-icon {
      font-size: 1.45rem;
      cursor: pointer;
    }
    .add-done {
      cursor: pointer;
      font-size: 0.75rem;
    }
    span {
      color: #aaa;
      font-weight: normal;
    }
  }
  .selected-preview {
    user-select: none;
    width: 100%;
    box-sizing: border-box;
    overflow-x: scroll;
    overflow-y: hidden;
    height: 4.5rem;
    padding: 0.8rem 1.25rem 0.4rem;

    .in {
      white-space: nowrap;
    }
    .selected-avatar {
      position: relative;
      display: inline-flex;
      width: 2.4rem;
      height: 3.4rem;
      margin-right: 0.6rem;
      padding-right: 0.3rem;
      .close {
        position: absolute;
        right: 0;
        top: 0;
        z-index: 9999;
        cursor: pointer;
      }
      .avatar {
        width: 2.4rem;
        height: 2.4rem;
      }
      .name {
        text-align: center;
        font-size: 0.6rem;
        position: absolute;
        bottom: 0;
        left: -0.3rem;
        width: 3rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }
  .list {
    font-size: 0.8rem;
    height: calc(72vh - 6.4rem);
    .item {
      position: relative;
      li {
        padding-left: 3rem;
      }
      &.before-selected {
        opacity: 0.67;
        /deep/ li {
          cursor: default;
        }
      }
      .choice-icon {
        position: absolute;
        cursor: pointer;
        z-index: 10;
        left: 1rem;
        top: 1rem;
        font-size: 1.6rem;
        &.selected {
          top: 1.1rem;
        }
      }
    }
  }
}
.modal-enter {
  opacity: 0;
}
.modal-leave-active {
  opacity: 0;
}
.modal-enter .modal-container,
.modal-leave-active .modal-container {
  transform: scale(1.1);
}
</style>
