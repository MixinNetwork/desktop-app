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
  max-width: 80px;
  white-space: nowrap;
  padding-left: 8px;
  padding-right: 8px;
  margin: 3px;
  padding-top: 8px;
  padding-bottom: 8px;
  background: #e8e8e8;
  border-radius: 20px;
  height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1, 1;
}
</style>
