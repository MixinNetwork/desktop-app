<template>
  <li class="user_item_layout" @click="$emit('item-click',group)">
    <Avatar class="user_item_avatar" :conversation="group"/>
    <p class="user_name">{{group.groupName}}</p>
  </li>
</template>
<script>
import Avatar from '@/components/Avatar.vue'
export default {
  components: {
    Avatar
  },
  name: 'GroupItem',
  props: ['group'],
  data: function() {
    return {}
  }
}
</script>
<style lang="scss" scoped>
.user_item_layout {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.8rem 0.8rem;
  &:hover,
  &.current {
    background: #f1f2f2;
  }
  border: none;
  border-bottom: 1px solid #f2f2f2;

  background: white;

  .user_item_avatar {
    width: 48px;
    height: 48px;
    margin-right: 16px;
  }
  .user_name {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
