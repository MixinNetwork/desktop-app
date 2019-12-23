<template>
  <li class="user_item_layout" @click="$emit('item-click',chat)">
    <Avatar class="user_item_avatar" :conversation="chat" />
    <slot name="check"></slot>
    <p class="user_name">
      <span v-html="highlight(chat.groupName || chat.name)"></span>
      <ICRobot v-if="chat.appId" />
    </p>
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
  name: 'ChatItem',
  props: ['chat', 'keyword'],
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
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.4rem 1.4rem;
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
      margin: 3px 0 0 0;
    }
  }
}
</style>
