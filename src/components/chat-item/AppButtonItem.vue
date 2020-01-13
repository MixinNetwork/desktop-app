<template>
  <div class="app-button layout">
    <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
      <div class="button-group">
        <div
          class="button-item"
          @click="$emit('action-click', item.action)"
          :style="{color: item.color}"
          v-for="item in messageContent"
          :key="item.action"
        >{{item.label}}</div>
      </div>
    </BadgeItem>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import BadgeItem from './BadgeItem.vue'

@Component({
  components: {
    BadgeItem
  }
})
export default class AppButtonItem extends Vue {
  @Prop(Object) readonly message: any

  get messageContent() {
    return JSON.parse(this.message.content)
  }
}
</script>
<style lang="scss" scoped>
.app-button {
  display: flex;
  margin-left: 0.8rem;
  margin-right: 0.8rem;

  .button-group {
    display: flex;
    flex-wrap: wrap;
    .button-item {
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 500;
      margin-right: 0.6rem;
      margin-bottom: 0.4rem;
      white-space: nowrap;
      border-radius: 0.4rem;
      box-shadow: 0px 1px 1px #77777733;
      background-color: white;
      padding: 0.45rem 0.75rem;
      &:last-child {
        margin-right: 0;
      }
    }
  }
}
</style>
