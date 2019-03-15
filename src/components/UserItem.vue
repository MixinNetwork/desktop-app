<template>
  <li class="user_item_layout" @click="$emit('user-click',user)">
    <Avatar class="user_item_avatar" :user="user"/>
    <p>{{user.full_name}}</p>
  </li>
</template>
<script>
import Avatar from '@/components/Avatar.vue'
export default {
  components: {
    Avatar
  },
  name: 'UserItem',
  props: ['user'],
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
}
</style>
