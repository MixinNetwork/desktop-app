<template>
  <li class="item_layout" @click="$emit('item-click',chat)">
    <Avatar class="item_avatar" :conversation="chat" />
    <div class="content">
      <div class="title">
        <div class="name">
          <span v-if="chat.records">{{chat.groupName || chat.name}}</span>
          <span v-else v-html="highlight(chat.groupName || chat.name)"></span>
          <ICRobot v-if="chat.appId" />
        </div>
      </div>
      <div v-if="chat.records" class="record">{{chat.records}} {{$t('chat.chat_records')}}</div>
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
.item_layout {
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.6rem 1.4rem;
  &:hover,
  &.current {
    background: #f7f7f7;
  }
  border: none;

  background: white;

  .item_avatar {
    width: 3rem;
    height: 3rem;
    margin-right: 0.8rem;
    flex-shrink: 0;
  }
  .content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    .name {
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
  }
  .record {
    display: flex;
    flex: 1;
    font-size: 0.8rem;
    color: #bbbec3;
    margin-top: 0.2rem;
  }
}
</style>
