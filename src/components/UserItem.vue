<template>
  <li class="user-item" @click="$emit('user-click',user)">
    <Avatar class="user-item-avatar" :user="user" />
    <div class="content">
      <div class="title">
        <div class="name">
          <span v-html="$w(highlight(user.full_name, 'name', /^@/.test(keyword)))"></span>
          <svg-icon style="font-size: 0.7rem" icon-class="ic_robot" v-if="user.app_id" />
        </div>
        <span class="role" v-if="user.role">
          {{ $t({
          OWNER: 'chat.owner',
          ADMIN: 'chat.admin'}[user.role])
          }}
        </span>
      </div>
      <div class="id">
        <span v-html="$w(highlight(user.identity_number, 'id', /^@/.test(keyword)))"></span>
      </div>
    </div>
  </li>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

import Avatar from '@/components/Avatar.vue'
import contentUtil from '@/utils/content_util'

@Component({
  components: {
    Avatar
  }
})
export default class UserItem extends Vue {
  @Prop(String) readonly keyword: any
  @Prop(Object) readonly user: any

  highlight(content: string, type: string, isMention: any) {
    let keyword = this.keyword
    if (isMention) {
      if (type === 'id') {
        content = `@${content}`
      } else if (type === 'name') {
        keyword = keyword.substring(1, keyword.length)
      }
      if (keyword === '@') {
        return content
      }
    }
    return contentUtil.highlight(content, keyword, '')
  }
}
</script>
<style lang="scss" scoped>
.user-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  contain: layout;
  cursor: pointer;
  padding: 0.45rem 1.1rem;
  &:hover,
  &.current {
    background: #f7f7f7;
  }
  border: none;

  background: white;

  .user-item-avatar {
    width: 2.4rem;
    height: 2.4rem;
    margin-right: 0.6rem;
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
        margin: 0.15rem 0 0 0.3rem;
      }
    }
    .title {
      display: flex;
      justify-content: space-between;
    }
    .id {
      display: flex;
      flex: 1;
      font-size: 0.6rem;
      color: #bbbec3;
      margin-top: 0.15rem;
      span {
        margin-right: 0.1rem;
      }
    }
    .role {
      float: right;
      color: #bbbec3;
      margin-top: 0.15rem;
      font-size: 0.6rem;
    }
  }
}
</style>
