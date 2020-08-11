<template>
  <div class="root" @click="avatarClick" ref="root">
    <div class="avatar-group" :data-group-size="users.length">
      <div class="empty" v-if="users.length<=0"></div>
      <div v-else v-for="user in users" :key="user.user_id" class="avatar" :class="{unload: !loaded}" :style="user.color">
        <img v-if="user.has_avatar && loaded" v-show="showImg" :src="user.avatar_url" @load="showImg=true" @error="imgError" />
        <div v-else-if="!loaded"><svg-icon icon-class="avatar" class="default-avatar" /></div>
        <span v-if="!user.has_avatar && user.emoji" class="emoji" :style="font">{{user.emoji}}</span>
        <span v-if="!user.has_avatar && !user.emoji" :style="font">{{user.identifier.toUpperCase()}}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { ConversationCategory } from '@/utils/constants'
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
  u.full_name = u.full_name || ''
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

  @Watch('conversation.conversationId')
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

  loaded: boolean = true
  showImg: boolean = false
  users: any = []
  font: any = {}

  beforeMount() {
    this.onChange()
  }

  mounted() {
    this.onChange()
  }

  avatarClick() {
    this.onChange()
    this.$emit('onAvatarClick')
  }

  imgError(e: any) {
    e.onerror = null
    this.loaded = false
  }

  onChange() {
    this.loaded = true
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
      if (users.length >= 4) {
        const temp = []
        let i = 0
        while (i < 4) {
          i++
          temp.push(users[users.length - i])
        }
        users = temp
      }
      users.map((u: any) => {
        u.has_avatar = false

        emoji(u)
        if (u.avatar_url && u.avatar_url.startsWith('http')) {
          u.has_avatar = true
        } else if (u.user_id) {
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
  width: 2rem;
  height: 2rem;
  font-size: 1rem;
  .empty {
    width: 100%;
    height: 100%;
    background: #d2d2d2;
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
      background: #d2d2d2;
    }
    span {
      color: white;
    }
    .emoji {
      margin-left: 0.25rem;
    }
    .default-avatar {
      width: 100%;
      height: 100%;
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
    border-left: 0.05rem solid white;
    margin-left: -0.05rem;
  }
  .avatar-group[data-group-size='3'] .avatar:nth-child(3),
  .avatar-group[data-group-size='4'] .avatar:nth-child(3),
  .avatar-group[data-group-size='4'] .avatar:nth-child(4) {
    top: 50%;
    border-top: 0.05rem solid white;
    margin-top: -0.05rem;
  }
  .avatar-group[data-group-size='3'] .avatar:nth-child(2),
  .avatar-group[data-group-size='3'] .avatar:nth-child(3),
  .avatar-group[data-group-size='4'] .avatar {
    width: 50%;
    height: 50%;
  }
}
</style>
