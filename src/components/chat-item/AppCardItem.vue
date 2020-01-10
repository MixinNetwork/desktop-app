<template>
  <div class="layout">
    <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
      <div class="app-card" @click="$emit('action-click', messaageContent.action)">
        <MessageItemIcon :url="messaageContent.icon_url" />
        <div class="content">
          <span class="title">{{messaageContent.title}}</span>
          <div class="desc">{{messaageContent.description}}</div>
        </div>
      </div>
    </BadgeItem>
  </div>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import BadgeItem from './BadgeItem.vue'
import MessageItemIcon from '@/components/MessageItemIcon.vue'

@Component({
  components: {
    BadgeItem,
    MessageItemIcon
  }
})
export default class App extends Vue {
  @Prop(Object) readonly message: any

  get messaageContent() {
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
.app-card {
  display: flex;
  cursor: pointer;
  box-shadow: 0px 1px 1px #77777733;
  background-color: white;
  border-radius: 0.2rem;
  padding: 0.75rem;
  .content {
    max-width: 14rem;
    * {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .title {
      font-size: 1rem;
    }
    .desc {
      color: #888888cc;
      font-size: 0.8rem;
    }
  }
}
</style>
