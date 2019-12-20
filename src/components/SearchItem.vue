<template>
  <li class="search-item" @click="$emit('search-click',item)">
    <div
      class="time"
    >{{$moment(item.created_at).format('YYYY-MM-DD HH:mm')}}（{{$moment(item.created_at).fromNow().replace(/\s/, '')}}）</div>
    <div class="content">
      <div v-html="highlight(item.content)"></div>
    </div>
  </li>
</template>
<script>
import contentUtil from '@/utils/content_util.js'

export default {
  components: {},
  name: 'SearchItem',
  props: ['item', 'keyword'],
  data: function() {
    return {}
  },
  methods: {
    highlight(content) {
      return contentUtil.highlight(content, this.keyword)
    }
  }
}
</script>
<style lang="scss" scoped>
.search-item {
  display: flex;
  flex-direction: column;
  padding: 10px 16px;
  cursor: pointer;
  &:hover,
  &.current {
    background: #f1f2f2;
  }
  border-bottom: 1px solid $border-color;

  background: white;

  .time {
    flex: 1;
    font-size: 0.85rem;
    padding-bottom: 0.25rem;
    color: #777;
  }
  .content {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 1rem;
  }
}
</style>
