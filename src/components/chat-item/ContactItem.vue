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
          <Avatar id="avatar" :user="user" />
          <div class="content">
            <span class="name">
              <span>{{message.sharedUserFullName}}</span>
              <ICRobot v-if="message.sharedUserAppId" />
            </span>
            <div class="bottom">
              <span class="number">{{message.sharedUserIdentityNumber}}</span>
              <span class="time">
                {{message.lt}}
                <ICSending
                  v-if="message.userId === me.user_id && (message.status === MessageStatus.SENDING)"
                  class="icon"
                />
                <ICSend
                  v-else-if="message.userId === me.user_id && message.status === MessageStatus.SENT"
                  class="icon"
                />
                <ICRead
                  v-else-if="message.userId === me.user_id && message.status === MessageStatus.DELIVERED"
                  class="icon wait"
                />
                <ICRead
                  v-else-if="message.userId === me.user_id && message.status === MessageStatus.READ"
                  class="icon"
                />
              </span>
            </div>
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script>
import Avatar from '@/components/Avatar'
import userDao from '@/dao/user_dao.js'
import ICSending from '@/assets/images/ic_status_clock.svg'
import ICSend from '@/assets/images/ic_status_send.svg'
import ICRead from '@/assets/images/ic_status_read.svg'
import ICRobot from '@/assets/images/ic_robot.svg'
import BadgeItem from './BadgeItem'

import { MessageStatus } from '@/utils/constants.js'
import { getNameColorById } from '@/utils/util.js'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
  components: {
    Avatar,
    ICSending,
    ICSend,
    ICRead,
    ICRobot,
    BadgeItem
  },
  data: function() {
    return {
      MessageStatus: MessageStatus
    }
  },
  methods: {
    messageOwnership: function() {
      return {
        send: this.message.userId === this.me.user_id,
        receive: this.message.userId !== this.me.user_id
      }
    },
    getColor: function(id) {
      return getNameColorById(id)
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
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  .username {
    margin-left: 0.4rem;
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.2rem;
    min-width: 2rem;
    min-height: 0.85rem;
  }
  .contact {
    padding: 12px;
    background: white;
    display: flex;
    flex-direction: row;
    align-content: center;
    min-width: 12rem;
    max-width: 14rem;
    border-radius: 0.4rem;
    box-shadow: 0px 1px 1px #77777733;
    #avatar {
      width: 42px;
      height: 42px;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .content {
      display: flex;
      flex: 1;
      flex-direction: column;
      text-align: start;
      max-width: calc(100% - 54px);
      .name {
        font-size: 1rem;
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
          margin: 0.2rem 0 0 0.4rem;
        }
      }
      .bottom {
        display: flex;
        justify-content: space-between;
        .number {
          color: #888888cc;
          font-size: 0.8rem;
          margin-top: 6px;
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
          .wait {
            path {
              fill: #859479;
            }
          }
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
