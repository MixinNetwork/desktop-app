<template>
  <div class="layout" v-bind:class="messageOwnership()">
    <div class="contact" @click="$emit('user-click')">
      <Avatar id="avatar" :user="user"/>
      <div class="content">
        <span class="name">{{message.sharedUserFullName}}</span>
        <span class="number">{{message.sharedUserIdentityNumber}}</span>
      </div>
      <span class="time" v-if="message.userId === me.user_id">
        {{message.lt}}
        <ICSending
          v-if="message.status === MessageStatus.SENDING || message.status === MessageStatus.PENDING"
          class="icon"
        />
        <ICSend v-else-if="message.status === MessageStatus.SENT" class="icon"/>
        <ICRead v-else-if="message.status === MessageStatus.DELIVERED" class="icon wait"/>
        <ICRead v-else-if="message.status === MessageStatus.READ" class="icon"/>
      </span>
    </div>
  </div>
</template>
<script>
import Avatar from './Avatar'
import userDao from '@/dao/user_dao.js'
import ICSending from '../assets/images/ic_status_clock.svg'
import ICSend from '../assets/images/ic_status_send.svg'
import ICRead from '../assets/images/ic_status_read.svg'
import { MessageStatus } from '@/utils/constants.js'
export default {
  props: ['conversation', 'message', 'me'],
  components: {
    Avatar,
    ICSending,
    ICSend,
    ICRead
  },
  data: function() {
    return {
      MessageStatus: MessageStatus
    }
  },
  methods: {
    messageOwnership: function() {
      let { message, me } = this
      return {
        send: this.message.userId === this.me.user_id,
        receive: this.message.userId !== this.me.user_id
      }
    }
  },
  computed: {
    user: function() {
      return userDao.findUserById(this.message.sharedUserId)
    }
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  padding-left: 0.8rem;
  padding-right: 0.8rem;
  .contact {
    padding-left: 12px;
    padding-right: 0.2rem;
    padding-top: 12px;
    padding-bottom: 12px;
    background: white;
    border-radius: 0.4rem;
    display: flex;
    flex-direction: row;
    max-width: 12rem;
    box-shadow: 1px 1px 1px #33333333;
    #avatar {
      margin-right: 16px;
    }
    .content {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      margin-right: 16px;
      text-align: start;
      .name {
        font-size: 1rem;
      }
      .number {
        color: #88888888;
        font-size: 0.8rem;
      }
    }
    .time {
      color: #8799a5;
      display: flex;
      float: right;
      font-size: 0.75rem;
      bottom: 0.3rem;
      right: 0.2rem;
      align-items: flex-end;
      .icon {
        padding-left: 0.2rem;
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
