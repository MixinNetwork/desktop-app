<template>
  <div class="layout" :class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="contact" @click="$emit('user-share-click')">
          <ReplyMessageItem
            v-if="message.quoteContent"
            :message="JSON.parse(message.quoteContent)"
            :me="me"
            class="reply"
          ></ReplyMessageItem>
          <Avatar id="avatar" :user="user" />
          <div class="content">
            <span class="name">
              <span>{{message.sharedUserFullName}}</span>
              <svg-icon
                style="font-size: 0.7rem"
                icon-class="ic_robot"
                v-if="message.sharedUserAppId"
              />
            </span>
            <div class="bottom">
              <span class="number">{{message.sharedUserIdentityNumber}}</span>
              <TimeAndStatus :message="message" />
            </div>
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import ReplyMessageItem from './ReplyMessageItem.vue'
import Avatar from '@/components/Avatar.vue'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import userDao from '@/dao/user_dao'

import { MessageStatus } from '@/utils/constants'
import { getNameColorById } from '@/utils/util'
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component({
  components: {
    ReplyMessageItem,
    Avatar,
    BadgeItem,
    TimeAndStatus
  }
})
export default class ContactItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  MessageStatus: any = MessageStatus

  messageOwnership() {
    return {
      send: this.message.userId === this.me.user_id,
      receive: this.message.userId !== this.me.user_id
    }
  }
  getColor(id: string) {
    return getNameColorById(id)
  }

  get user() {
    return userDao.findUserById(this.message.sharedUserId)
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  font-size: 0;
  .username {
    margin-left: 0.3rem;
    display: inline-block;
    font-size: 0.65rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.15rem;
    min-width: 1.6rem;
    min-height: 0.65rem;
  }
  .contact {
    cursor: pointer;
    background: white;
    display: flex;
    flex-direction: row;
    align-content: center;
    min-width: 11rem;
    border-radius: 0.2rem;
    box-shadow: 0 0.05rem 0.05rem #77777733;
    flex-wrap: wrap;
    max-width: 14rem;
    .reply {
      margin-bottom: 0;
      width: 100%;
    }
    #avatar {
      width: 2.1rem;
      height: 2.1rem;
      flex-shrink: 0;
      margin: 0.6rem;
    }
    .content {
      max-width: 8rem;
      padding: 0.6rem 0.6rem 0.6rem 0;
      display: flex;
      flex: 1;
      flex-direction: column;
      text-align: start;
      .name {
        font-size: 0.8rem;
        overflow: hidden;
        display: flex;
        span {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        svg {
          vertical-align: top;
          flex-shrink: 0;
          margin: 0.15rem 0 0 0.3rem;
        }
      }
      .bottom {
        display: flex;
        justify-content: space-between;
        .number {
          color: #888888cc;
          font-size: 0.6rem;
          margin-top: 0.3rem;
        }
      }
    }
  }
}
.layout.send {
  flex-direction: row-reverse;
}
.layout.receive {
  flex-direction: row;
}
</style>
