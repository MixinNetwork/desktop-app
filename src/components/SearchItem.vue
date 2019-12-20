<template>
  <li class="search-item" @click="$emit('search-click',item)">
    <div class="time">{{item.created_at}}</div>
    <div class="content">
      <div v-html="highlight(item.content)"></div>
    </div>
  </li>
</template>
<script>
export default {
  components: {},
  name: 'SearchItem',
  props: ['item', 'keyword'],
  data: function() {
    return {}
  },
  methods: {
    highlight(content) {
      const segment = this.keyword.split(' ')
      let result = content
      segment.forEach(keyword => {
        if (keyword.trim()) {
          keyword = keyword.replace(/[.[*?+^$|()/]|\]|\\/g, '\\$&')
          const regx = new RegExp('(' + keyword + ')', 'ig')
          result = result.replace(regx, `<b>$1</b>`)
        }
      })
      return result
    }
  }
}
</script>
<style lang="scss" >
.search-item {
  display: flex;
  flex-direction: column;
  padding: 0.8rem 0.8rem;
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
    b {
      font-weight: normal;
      color: #3d75e3;
    }
  }
}
</style>
