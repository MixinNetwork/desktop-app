<template>
  <div class="item" @click="$emit('user-click-a',user)">{{user.full_name}}</div>
</template>
<script>
export default {
  name: 'UserSelectItem',
  props: ['user']
}
</script>
<style lang="scss" scoped>
.item {
  max-width: 5rem;
  white-space: nowrap;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  margin: 0.1875rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  background: #e8e8e8;
  border-radius: 1.25rem;
  height: 1.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1, 1;
}
</style>
