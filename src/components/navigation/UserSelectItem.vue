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
  max-width: 4rem;
  white-space: nowrap;
  padding-left: 0.4rem;
  padding-right: 0.4rem;
  margin: 0.15rem;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  background: #e8e8e8;
  border-radius: 1rem;
  height: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1, 1;
}
</style>
