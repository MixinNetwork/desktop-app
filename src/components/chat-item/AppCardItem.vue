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
        <div class="app-card" @click="$emit('action-click', messageContent.action)">
          <MessageItemIcon :url="messageContent.icon_url" />
          <div class="content">
            <span class="title">{{messageContent.title}}</span>
            <div class="desc">{{messageContent.description}}</div>
          </div>
        </div>
        <div class="bottom">
          <TimeAndStatus :relative="true" :message="message" />
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import BadgeItem from './BadgeItem.vue'
import MessageItemIcon from './MessageItemIcon.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import { getNameColorById } from '@/utils/util'

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

  get messageContent() {
    return JSON.parse(this.message.content)
  }

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
}
</script>
<style lang="scss" scoped>
.layout.send {
  flex-direction: row-reverse;
}
.layout.receive {
  flex-direction: row;
}
.layout {
  display: flex;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  flex-direction: column;
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
.app-card {
  display: flex;
  cursor: pointer;
  box-shadow: 0 0.05rem 0.05rem #77777733;
  background-color: white;
  border-radius: 0.2rem;
  padding: 0.6rem;
  max-width: 12rem;
  .content {
    display: flex;
    flex-direction: column;
    align-content: center;
    &,
    * {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .title {
      font-size: 0.8rem;
      margin-bottom: 0.2rem;
      line-height: 1.2;
      text-align: left;
    }
    .desc {
      color: #888888cc;
      font-size: 0.6rem;
      text-align: left;
      line-height: 1.4;
    }
  }
}
.bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  padding: 0.1rem;
}
</style>
