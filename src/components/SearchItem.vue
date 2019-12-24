<template>
  <li class="search-item" @click="$emit('search-click',item)">
    <Avatar class="avatar" :user="item" :conversation="null" />
    <div class="box">
      <div class="meta">
        <div v-html="highlight(item.full_name)"></div>
        <div class="time">{{renderTime(item.created_at)}}</div>
      </div>
      <div class="content">
        <div v-html="highlight(item.content)"></div>
      </div>
    </div>
  </li>
</template>
<script>
import contentUtil from '@/utils/content_util.js'
import Avatar from '@/components/Avatar.vue'

export default {
  components: {
    Avatar
  },
  name: 'SearchItem',
  props: ['item', 'keyword'],
  data: function() {
    return {}
  },
  methods: {
    renderTime(timeStr) {
      return contentUtil.renderTime(timeStr, true)
    },
    highlight(content) {
      return contentUtil.highlight(content, this.keyword)
    }
  }
}
</script>
<style lang="scss" scoped>
.search-item {
  display: flex;
  padding: 10px 16px;
  cursor: pointer;
  &:hover,
  &.current {
    background: #f1f2f2;
  }
  border-bottom: 1px solid $border-color;

  background: white;

  .box {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
  .avatar {
    margin-right: 0.8rem;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    .name {
      flex: 1;
    }
    .time {
      font-size: 0.85rem;
      padding-bottom: 0.25rem;
      color: #999;
    }
  }
  .content > div {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 0.9rem;
    color: #777;
  }
}
</style>
