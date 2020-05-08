<template>
  <div class="home dashboard">
    <HomeTitleBar v-if="showTitlebar" />
    <div class="main" :style="{ height: showTitlebar ? 'calc(100vh - 1.4rem)' : '100vh' }">
      <Navigation />
      <ChatContainer />
    </div>
  </div>
</template>

<script lang="ts">
import HomeTitleBar from '@/components/HomeTitleBar.vue'
import ChatContainer from '@/components/ChatContainer.vue'
import Navigation from '@/components/Navigation.vue'
import accountApi from '@/api/account'
import workerManager from '@/workers/worker_manager'
import { LinkStatus } from '@/utils/constants'
import { clearDb } from '@/persistence/db_util'
import userDao from '@/dao/user_dao'
import messageDao from '@/dao/message_dao'
import conversationDao from '@/dao/conversation_dao'
import { getAccount } from '@/utils/util'

import { Vue, Component } from 'vue-property-decorator'

@Component({
  components: {
    HomeTitleBar,
    ChatContainer,
    Navigation
  }
})
export default class Home extends Vue {
  select: any = 0
  $blaze: any

  get showTitlebar() {
    return process.platform === 'win32'
  }

  beforeMount() {
    this.$store.dispatch('init')
  }

  ftsMessageLoadAll() {
    const count = messageDao.ftsMessageCount()
    if (!count) {
      const conversations = conversationDao.getConversations()
      conversations.forEach((conversation: any) => {
        messageDao.ftsMessageLoad(conversation.conversationId)
      })
    }
  }

  async created() {
    const account: any = getAccount()
    if (!userDao.isMe(account.user_id)) {
      accountApi.logout().then((resp: any) => {
        this.$blaze.closeBlaze()
        this.$router.push('/sign_in')
        clearDb()
      })
    }
    this.ftsMessageLoadAll()

    this.$blaze.connect()
    workerManager.start()
    accountApi.getFriends().then(
      (resp: any) => {
        const friends = resp.data.data
        if (friends && friends.length > 0) {
          this.$store.dispatch('refreshFriends', friends)
        }
      },
      (err: any) => {
        console.log(err)
      }
    )
    const self = this
    if (window.navigator.onLine) {
      self.$store.dispatch('setLinkStatus', LinkStatus.CONNECTED)
    } else {
      self.$store.dispatch('setLinkStatus', LinkStatus.NOT_CONNECTED)
    }
    window.addEventListener('offline', function(e) {
      self.$store.dispatch('setLinkStatus', LinkStatus.NOT_CONNECTED)
      console.log('----offline')
    })

    let emitLock = false
    window.addEventListener('online', function(e) {
      console.log('----online')
      if (!self.$blaze.isConnect() && !emitLock) {
        emitLock = true
        setTimeout(() => {
          emitLock = false
        })
        self.$blaze.connect()
      }
      self.$store.dispatch('setLinkStatus', LinkStatus.CONNECTED)
    })
  }
}
</script>

<style lang="scss" scoped>
.home.dashboard {
  overflow: hidden;
  height: 100vh;
  .main {
    display: flex;
  }
}
</style>
