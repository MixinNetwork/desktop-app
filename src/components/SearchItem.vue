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
    highlight(text) {
      const keys = []
      for (let i = 0; i < this.keyword.length; i++) {
        keys.push(this.keyword.substr(i, 1))
      }
      let result = ''
      for (let j = 0; j < text.length; j++) {
        const temp = text.substr(j, 1)
        if (keys.indexOf(temp) > -1) {
          result += `<b>${temp}</b>`
        } else {
          result += temp
        }
      }
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
