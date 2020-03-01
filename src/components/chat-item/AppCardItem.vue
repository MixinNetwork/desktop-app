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
        <svg-icon style="width: 0.75rem" icon-class="ic_robot" />
      </span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="app-card" @click="$emit('action-click', messageContent.action)">
          <MessageItemIcon :url="messageContent.icon_url" />
          <div class="content">
            <span class="title">{{messageContent.title}}</span>
            <div class="desc">{{messageContent.description}}</div>
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

@Component({
  components: {
    BadgeItem,
    MessageItemIcon
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

  get messageContent() {
    return JSON.parse(this.message.content)
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.4rem;
  margin-right: 0.4rem;
}
.layout.send {
  flex-direction: row-reverse;
}
.layout.receive {
  flex-direction: row;
}
.username {
  margin-left: 0.4rem;
  display: inline-block;
  font-size: 0.85rem;
  max-width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  min-width: 2rem;
  min-height: 0.85rem;
  .svg-icon {
    margin-top: 0.075rem;
  }
}
.app-card {
  display: flex;
  cursor: pointer;
  box-shadow: 0px 1px 1px #77777733;
  background-color: white;
  border-radius: 0.2rem;
  padding: 0.75rem;
  .content {
    display: flex;
    flex-direction: column;
    align-content: center;
    max-width: 14rem;
    &,
    * {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .title {
      font-size: 1rem;
      margin-bottom: .25rem;
      line-height: 1.2;
      text-align: left;
    }
    .desc {
      color: #888888cc;
      font-size: 0.8rem;
      line-height: 1.4;
    }
  }
}
</style>
