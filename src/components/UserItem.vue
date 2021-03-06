<template>
  <li
    class="user-item"
    @click="$emit('user-click',user)"
    @mousedown="mousedown"
    @contextmenu.prevent
  >
    <Avatar class="user-item-avatar" :user="user" />
    <div class="content">
      <div>
        <div class="title">
          <div class="name">
            <span v-if="mention" class="mention" v-html="mention[0]"></span>
            <span v-else v-html="$w(highlight(htmlEscape(user.full_name), 'name'))"></span>
            <svg-icon style="font-size: 0.7rem" icon-class="ic_robot" v-if="user.app_id" />
          </div>
        </div>
        <div class="id">
          <span v-if="mention" class="mention" v-html="mention[1]"></span>
          <span v-else v-html="$w(highlight(user.identity_number, 'id'))"></span>
        </div>
      </div>
      <span class="role" v-if="user.role">
        {{ $t({
        OWNER: 'chat.owner',
        ADMIN: 'chat.admin'}[user.role])
        }}
      </span>
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
  @Prop(Array) readonly mention: any
  @Prop(String) readonly keyword: any
  @Prop(Object) readonly user: any

  highlight(content: string, type: string) {
    let keyword = this.keyword
    return contentUtil.highlight(content, keyword, '')
  }

  htmlEscape(content: any) {
    return contentUtil.htmlEscape(content)
  }

  mousedown(e: any) {
    if (e.button === 2) {
      this.$emit('show-contextmenu', this.user)
    }
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
  &:hover {
    background: $hover-bg-color;
  }
  &.current {
    background: $active-bg-color;
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
    overflow: hidden;
    justify-content: space-between;
    align-items: center;
    .name {
      overflow: hidden;
      display: flex;
      justify-content: flex-start;
      flex: 1;
      span {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        line-height: 1.2rem;
      }
      svg {
        flex-shrink: 0;
        vertical-align: top;
        margin: 0.2rem 0 0 0.3rem;
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
      color: #bbbec3;
      font-size: 0.6rem;
    }
  }
  /deep/ .mention {
    span {
      color: #3d75e3;
    }
  }
}
</style>
