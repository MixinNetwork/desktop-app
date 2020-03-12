<template>
  <li class="item_layout" @click="$emit('item-click',chat)">
    <Avatar class="item_avatar" :conversation="chat" />
    <div class="content">
      <div class="title">
        <div class="name">
          <span v-if="chat.records">{{chat.groupName || chat.name}}</span>
          <span v-else v-html="$w(highlight(chat.groupName || chat.name))"></span>
          <svg-icon style="font-size: 0.7rem" icon-class="ic_robot" v-if="chat.appId" />
        </div>
      </div>
      <div v-if="chat.records" class="record">{{$t('chat.chat_records', { '0': chat.records })}}</div>
    </div>
  </li>
</template>
<script lang="ts">
import Avatar from '@/components/Avatar.vue'
import contentUtil from '@/utils/content_util'
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component({
  components: {
    Avatar
  }
})
export default class ChatItem extends Vue {
  @Prop(Object) readonly chat: any
  @Prop(String) readonly keyword: any

  highlight(content: string) {
    return contentUtil.highlight(content, this.keyword, '')
  }
}
</script>
<style lang="scss" scoped>
.item_layout {
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.45rem 1.1rem;
  &:hover,
  &.current {
    background: #f7f7f7;
  }
  border: none;

  background: white;

  .item_avatar {
    width: 2.4rem;
    height: 2.4rem;
    margin-right: 0.6rem;
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
        margin: 0.15rem 0 0 0.3rem;
      }
    }
  }
  .record {
    display: flex;
    flex: 1;
    font-size: 0.6rem;
    color: #bbbec3;
    margin-top: 0.15rem;
  }
}
</style>
