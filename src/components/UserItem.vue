<template>
  <li class="user_item_layout" @click="$emit('user-click',user)">
    <Avatar class="user_item_avatar" :user="user" />
    <div class="content">
      <div class="title">
        <div class="name">
          <span v-html="highlight(user.full_name)"></span>
          <ICRobot v-if="user.app_id" />
        </div>
        <span class="role" v-if="user.role">
          {{ $t({
          OWNER: 'chat.owner',
          ADMIN: 'chat.admin'}[user.role])
          }}
        </span>
      </div>
      <div class="id">
        <span v-html="highlight(user.identity_number)"></span>
      </div>
    </div>
  </li>
</template>
<script>
import Avatar from '@/components/Avatar.vue'
import ICRobot from '@/assets/images/ic_robot.svg'
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
    width: 3rem;
    height: 3rem;
    margin-right: 0.8rem;
    flex-shrink: 0;
  }
  .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    .name {
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
        flex-shrink: 0;
        vertical-align: top;
        margin: 0.2rem 0 0 0.4rem;
      }
    }
    .title {
      display: flex;
      justify-content: space-between;
    }
    .id {
      display: flex;
      flex: 1;
      font-size: 0.8rem;
      color: #bbbec3;
      margin-top: 0.2rem;
      span {
        margin-right: 0.1rem;
      }
    }
    .role {
      float: right;
      color: #bbbec3;
      margin-top: 0.2rem;
      font-size: 0.8rem;
    }
  }
}
</style>
