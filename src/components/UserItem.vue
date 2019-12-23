<template>
  <li class="user_item_layout" @click="$emit('user-click',user)">
    <Avatar class="user_item_avatar" :user="user" />
    <div class="user_name">
      <span v-html="highlight(user.full_name)"></span>
      <ICRobot v-if="user.app_id" />
    </div>
  </li>
</template>
<script>
import Avatar from '@/components/Avatar.vue'
import ICRobot from '../assets/images/ic_robot.svg'
import contentUtil from '@/utils/content_util.js'
export default {
  components: {
    Avatar,
    ICRobot
  },
  name: 'UserItem',
  props: ['user', 'keyword'],
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
.user_item_layout {
  display: flex;
  flex-direction: row;
  align-items: center;
  cursor: pointer;
  padding: 0.6rem 1.4rem;
  &:hover,
  &.current {
    background: #f7f7f7;
  }
  border: none;

  background: white;

  .user_item_avatar {
    width: 48px;
    height: 48px;
    margin-right: 16px;
  }
  .user_name {
    overflow: hidden;
    display: flex;
    justify-content: flex-start;
    flex: 1;
    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    svg {
      width: 24px;
      vertical-align: top;
      margin: 3px 0 0 1px;
    }
  }
}
</style>
