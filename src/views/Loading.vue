<template>
  <div class="loading">
    <spinner v-if="isLoading" />
    <h4>{{$t('loading.initializing')}}</h4>
  </div>
</template>

<script lang="ts">
import spinner from '@/components/Spinner.vue'
import accountAPI from '@/api/account'
import userAPI from '@/api/user'
import { checkSignalKey } from '@/utils/signal_key_util'
import { clearDb } from '@/persistence/db_util'

import { Vue, Component } from 'vue-property-decorator'

@Component({
  components: {
    spinner
  }
})
export default class Loading extends Vue {
  isLoading: boolean = true
  $electron: any
  $blaze: any

  async created() {
    if (localStorage.account && localStorage.sessionToken) {
      const account = await accountAPI.getMe().catch((err: any) => {
        console.log(err)
      })
      if (!localStorage.newVersion) {
        clearDb()
        this.$router.push('/sign_in')
        return
      }
      if (!account) {
        return
      }
      if (account && account.data.error) {
        if (account.data.error.code === 403) {
          clearDb()
          this.$router.push('/sign_in')
        } else {
          // ?
        }
        return
      }
      userAPI.updateSession({platform: 'Desktop', app_version: this.$electron.remote.app.getVersion()}).then(() => {
      })
      this.pushSignalKeys().then(() => {
        const user = account.data.data
        if (user) {
          localStorage.account = JSON.stringify(user)
          this.$store.dispatch('insertUser', user)
          this.$blaze.connect()
          this.$router.push('/home')
        }
      })
    }
  }

  pushSignalKeys() {
    // @ts-ignore
    return wasmObject.then(() => {
      checkSignalKey()
    })
  }
}
</script>

<style lang="scss" scoped>
.loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>
