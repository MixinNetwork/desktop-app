<template>
  <div class="app-button layout">
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
        <div class="button-group">
          <div
            class="button-item"
            @click="$emit('action-click', item.action)"
            :style="{color: item.color}"
            v-for="(item, index) in messageContent"
            :key="index"
          >{{item.label}}</div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import BadgeItem from './BadgeItem.vue'
import { getNameColorById } from '@/utils/util'

@Component({
  components: {
    BadgeItem
  }
})
export default class AppButtonItem extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Boolean) readonly showName: any

  getColor(id: string) {
    return getNameColorById(id)
  }

  get messageContent() {
    return JSON.parse(this.message.content)
  }
}
</script>
<style lang="scss" scoped>
.app-button {
  & > div {
    position: relative;
  }
  .layout {
    position: initial;
  }
  display: flex;
  margin-left: 0.6rem;
  margin-right: 0.6rem;
  .username {
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

  .button-group {
    display: flex;
    flex-wrap: wrap;
    .button-item {
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      margin-right: 0.45rem;
      margin-bottom: 0.3rem;
      white-space: nowrap;
      border-radius: 0.25rem;
      box-shadow: 0 0.05rem 0.05rem #77777733;
      background-color: white;
      padding: 0.35rem 0.6rem;
      &:last-child {
        margin-right: 0;
      }
    }
  }
}
</style>
