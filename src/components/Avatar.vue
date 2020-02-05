<template>
  <div class="root" @click="$emit('onAvatarClick')" ref="root">
    <div class="avatar-group" :data-group-size="users.length">
      <div class="empty" v-if="users.length<=0"></div>
      <div v-else v-for="user in users" :key="user.user_id" class="avatar" :class="{unload: !loaded}" :style="user.color">
        <img v-if="user.has_avatar && loaded" :src="user.avatar_url" @error="imgError" />
        <span v-if="!user.has_avatar && user.emoji" class="emoji" :style="font">{{user.emoji}}</span>
        <span v-if="!user.has_avatar && !user.emoji" :style="font">{{user.identifier.toUpperCase()}}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { ConversationCategory, LinkStatus } from '@/utils/constants'
import { getAvatarColorById } from '@/utils/util'
import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

const ranges = [
  '\ud83c[\udf00-\udfff]', // U+1F300 to U+1F3FF
  '\ud83d[\udc00-\ude4f]', // U+1F400 to U+1F64F
  '\ud83d[\ude80-\udeff]' // U+1F680 to U+1F6FF
].join('|')
let reg = new RegExp(ranges, 'g')
function emoji(u: any) {
  let emojis = u.full_name.match(reg)
  if (emojis && emojis.length > 0) {
    u.emoji = emojis[0]
    u.identifier = ''
  } else {
    u.emoji = null
    u.identifier = u.full_name.charAt(0)
  }
}

const scales = [1, 0.5, 0.4, 0.3, 0.25]

@Component
export default class Avatar extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly user: any

  @Getter('linkStatus') linkStatus: any

  @Watch('conversation')
  onConversationChange(newConversation: any, oldConversation: any) {
    if (newConversation) {
      this.onChange()
    }
  }
  @Watch('user')
  onUserChange(user: any) {
    if (user) {
      this.onChange()
    }
  }
  @Watch('linkStatus')
  onLinkStatus(status: any) {
    if (status === LinkStatus.CONNECTED) {
      this.loaded = false
      setTimeout(() => {
        this.loaded = true
      })
    }
  }

  loaded: boolean = true
  users: any = []
  font: any = {}

  beforeMount() {
    this.onChange()
  }

  mounted() {
    this.onChange()
  }

  imgError(e: any) {
    e.onerror = null
    this.loaded = false
  }

  onChange() {
    // @ts-ignore
    wasmObject.then(() => {
      const { conversation, user } = this
      let users = []
      if (conversation && conversation.category === ConversationCategory.GROUP) {
        users = conversation.participants
      } else if (conversation) {
        users = conversation.participants.filter((item: any) => {
          return item.user_id === conversation.ownerId
        })
      } else if (user) {
        users = [user]
      }
      users = users.slice(0, 4)
      users.map((u: any) => {
        u.has_avatar = false

        emoji(u)
        if (u.avatar_url && u.avatar_url.startsWith('http')) {
          u.has_avatar = true
        } else {
          u.color = { background: getAvatarColorById(u.user_id) }
        }
        return u
      })
      this.users = users
    })
  }
}
</script>

<style lang="scss" scoped>
.root {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.2rem;
  .empty {
    width: 100%;
    height: 100%;
    background: #eee;
  }

  .avatar-group {
    border-radius: 50%;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: 1;
  }
  .avatar,
  .avatar > img {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
  .avatar {
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1em !important;
    &.unload {
      background: #eee;
    }
    span {
      color: white;
    }
    .emoji {
      margin-left: 0.3125rem;
    }
  }
  .avatar-group[data-group-size='2'] .avatar:first-child,
  .avatar-group[data-group-size='2'] .avatar:nth-child(2) > img,
  .avatar-group[data-group-size='3'] .avatar:first-child {
    left: -25%;
  }
  .avatar-group[data-group-size='2'] .avatar:nth-child(2) > span {
    margin-left: -50%;
  }
  .avatar-group[data-group-size='2'] .avatar:nth-child(2),
  .avatar-group[data-group-size='3'] .avatar:nth-child(2),
  .avatar-group[data-group-size='3'] .avatar:nth-child(3),
  .avatar-group[data-group-size='4'] .avatar:nth-child(2),
  .avatar-group[data-group-size='4'] .avatar:nth-child(4) {
    left: 50%;
    border-left: 1px solid white;
    margin-left: -1px;
  }
  .avatar-group[data-group-size='3'] .avatar:nth-child(3),
  .avatar-group[data-group-size='4'] .avatar:nth-child(3),
  .avatar-group[data-group-size='4'] .avatar:nth-child(4) {
    top: 50%;
    border-top: 1px solid white;
    margin-top: -1px;
  }
  .avatar-group[data-group-size='3'] .avatar:nth-child(2),
  .avatar-group[data-group-size='3'] .avatar:nth-child(3),
  .avatar-group[data-group-size='4'] .avatar {
    width: 50%;
    height: 50%;
  }
}
</style>
