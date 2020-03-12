<template>
  <li class="search-item" @click="$emit('search-click',item)">
    <Avatar class="avatar" :user="item" :conversation="null" />
    <div class="box">
      <div class="meta">
        <div v-html="$w(highlight(item.full_name))"></div>
        <div class="time">{{renderTime(item.created_at)}}</div>
      </div>
      <div class="content">
        <div v-html="$w(highlight(content))"></div>
      </div>
    </div>
  </li>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

import contentUtil from '@/utils/content_util'
import Avatar from '@/components/Avatar.vue'

@Component({
  components: {
    Avatar
  }
})
export default class SearchItem extends Vue {
  @Prop(String) readonly keyword: any
  @Prop(Object) readonly item: any

  renderTime(timeStr: string) {
    return contentUtil.renderTime(timeStr, true)
  }
  highlight(content: string) {
    return contentUtil.highlight(content, this.keyword, '')
  }
  get content() {
    let content = this.item.content
    if (this.item.category.endsWith('_DATA')) {
      content = this.item.name
    }
    return content
  }
}
</script>
<style lang="scss" scoped>
.search-item {
  display: flex;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
  &:hover,
  &.current {
    background: #f1f2f2;
  }
  border-bottom: 0.05rem solid $border-color;

  background: white;

  .box {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
  .avatar {
    margin-right: 0.55rem;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    .name {
      flex: 1;
    }
    .time {
      user-select: none;
      font-size: 0.65rem;
      padding-bottom: 0.2rem;
      color: #999;
    }
  }
  .content > div {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 0.7rem;
    color: #777;
  }
}
</style>
