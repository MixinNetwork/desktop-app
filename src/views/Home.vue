<template>
  <div class="home dashboard">
    <navigation />
    <keep-alive>
      <ChatContainer />
    </keep-alive>
  </div>
</template>

<script>
import ChatContainer from '@/components/ChatContainer.vue'
import Navigation from '@/components/Navigation.vue'
import accountApi from '@/api/account'
import workerManager from '@/workers/worker_manager'
import { LinkStatus } from '@/utils/constants'
export default {
  name: 'home',
  data() {
    return {
      select: 0
    }
  },
  components: {
    ChatContainer,
    Navigation
  },
  beforeMount() {
    this.$store.dispatch('init')
  },
  created: async function() {
    this.$blaze.connect()
    workerManager.start()
    accountApi.getFriends().then(
      resp => {
        const friends = resp.data.data
        if (friends && friends.length > 0) {
          this.$store.dispatch('refreshFriends', friends)
        }
      },
      err => {
        console.log(err.data)
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

    window.addEventListener('online', function(e) {
      console.log('----online')
      if (!self.$blaze.isConnect()) {
        self.$blaze.connect()
      }

      self.$store.dispatch('setLinkStatus', LinkStatus.CONNECTED)
    })
  }
}
</script>

<style lang="scss" scoped>
.home.dashboard {
  display: flex;
  overflow: hidden;
  height: 100vh;
}
</style>
