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
        <svg-icon style="width: 0.6rem" icon-class="ic_robot" v-if="message.sharedUserAppId" />
      </span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="location" @click.stop="openMap">
          <!-- <MessageItemIcon :url="" /> -->
          <!-- {{messageContent.venue_type}} -->
          <div class="content">
            <div class="view" :style="{height: showDetail ? '' : '7.8rem'}">
              <div class="pin">
                <svg-icon icon-class="ic_map_pin" />
              </div>
              <div class="bg">
                <svg-icon icon-class="ic_map_default" />
              </div>
            </div>
            <span class="name" v-if="showDetail">{{messageContent.name}}</span>
            <div class="address" v-if="showDetail">{{messageContent.address}}</div>
            <span class="time-place" v-if="showDetail"></span>
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
import MessageItemIcon from './MessageItemIcon.vue'
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
    let url = `https://www.google.com/maps/place/@${latitude},${longitude},17z?hl=zh-CN`
    if (!address) {
      url = `https://www.google.com/maps/search/${encodeURIComponent(address)}/@${latitude},${longitude},17z?hl=zh-CN`
    }
    window.open(url)
  }

  get showDetail() {
    const { name, address } = this.messageContent
    return name && address
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
      height: 5rem;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      .pin {
        position: relative;
        z-index: 1;
        /deep/ svg {
          font-size: 2rem;
        }
      }
      .bg {
        top: 0;
        left: 0;
        position: absolute;
        margin-left: -1rem;
        user-select: none;
        /deep/ svg {
          font-size: 16rem;
        }
      }
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
