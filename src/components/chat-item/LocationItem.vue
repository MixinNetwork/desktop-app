<template>
  <div class="layout" :class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >
        {{message.userFullName}}
        <svg-icon style="width: 0.6rem" icon-class="ic_robot" />
      </span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="location" @click.stop="openMap">
          <!-- <MessageItemIcon :url="" /> -->
          <!-- {{messageContent.venue_type}} -->
          <div class="content">
            <div class="view"></div>
            <span class="name">{{messageContent.name}}</span>
            <div class="address">{{messageContent.address}}</div>
            <span class="time-place"></span>
            <TimeAndStatus :message="message" />
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import BadgeItem from './BadgeItem.vue'
import MessageItemIcon from '@/components/MessageItemIcon.vue'
import { getNameColorById } from '@/utils/util'
import TimeAndStatus from './TimeAndStatus.vue'
import browser from '@/utils/browser'
import axios from 'axios'

@Component({
  components: {
    BadgeItem,
    MessageItemIcon,
    TimeAndStatus
  }
})
export default class AppCardItem extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Boolean) readonly showName: any
  @Prop(Object) readonly me: any

  getColor(id: string) {
    return getNameColorById(id)
  }

  messageOwnership() {
    let { message, me } = this
    return {
      send: message.userId === me.user_id,
      receive: message.userId !== me.user_id
    }
  }

  openMap() {
    const { latitude, longitude, name = '', address = '' } = this.messageContent
    if (process.platform === 'darwin') {
      window.open(
        `https://maps.apple.com/?address=${encodeURIComponent(
          address
        )}&ll=${latitude},${longitude}&q=${encodeURIComponent(name)}`
      )
    } else {
      browser.loadURL(
        `https://www.google.com/maps/place/${latitude},${longitude}`
      )
    }
  }

  get messageContent() {
    return JSON.parse(this.message.content)
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
}
.layout.send {
  flex-direction: row-reverse;
}
.layout.receive {
  flex-direction: row;
}
.username {
  margin-left: 0.3rem;
  display: inline-block;
  font-size: 0.65rem;
  max-width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  min-width: 1.6rem;
  min-height: 0.65rem;
  .svg-icon {
    margin-top: 0.05rem;
  }
}
.location {
  display: flex;
  cursor: pointer;
  box-shadow: 0 0.05rem 0.05rem #77777733;
  background-color: white;
  border-radius: 0.2rem;
  overflow: hidden;
  .content {
    display: flex;
    flex-direction: column;
    align-content: center;
    width: 14rem;
    &,
    * {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .view {
      width: 100%;
      height: 6rem;
      background: #f5f7fa;
    }
    .name {
      padding: 0.6rem 0.6rem 0;
      font-size: 0.8rem;
      margin-bottom: 0.2rem;
      line-height: 1.2;
      text-align: left;
    }
    .address {
      padding: 0 0.6rem;
      color: #888888cc;
      font-size: 0.6rem;
      text-align: left;
      line-height: 1.4;
    }
  }
  .time-place {
    float: right;
    margin-left: 0.45rem;
    width: 3.6rem;
    height: 0.8rem;
  }
}
</style>
