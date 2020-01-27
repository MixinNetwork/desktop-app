<template>
  <div class="home dashboard">
    <navigation />
    <keep-alive>
      <ChatContainer />
    </keep-alive>
  </div>
</template>

<script lang="ts">
import ChatContainer from '@/components/ChatContainer.vue'
import Navigation from '@/components/Navigation.vue'
import accountApi from '@/api/account'
import workerManager from '@/workers/worker_manager'
import { LinkStatus } from '@/utils/constants'

import { Vue, Component } from 'vue-property-decorator'

@Component({
  components: {
    ChatContainer,
    Navigation
  }
})
export default class Home extends Vue {
  select: any = 0
  $blaze: any

  beforeMount() {
    this.$store.dispatch('init')
  }
  async created() {
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
  display: flex;
  overflow: hidden;
  height: 100vh;
}
</style>
