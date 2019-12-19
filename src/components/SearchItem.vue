<template>
  <li class="item_layout" @click="$emit('search-click',item)">
    <div class="time">{{item.created_at}}</div>
    <div class="name">{{item.content}}</div>
  </li>
</template>
<script>
export default {
  components: {},
  name: 'SearchItem',
  props: ['item'],
  data: function() {
    return {}
  }
}
</script>
<style lang="scss" scoped>
.item_layout {
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
  .name {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
