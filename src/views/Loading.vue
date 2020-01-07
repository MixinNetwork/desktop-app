<template>
  <div class="loading">
    <spinner v-if="isLoading" />
    <h4>{{$t('loading.initializing')}}</h4>
  </div>
</template>

<script>
import spinner from '@/components/Spinner.vue'
import accountAPI from '@/api/account'
import { checkSignalKey } from '@/utils/signal_key_util'
import { clearDb } from '@/persistence/db_util'

export default {
  components: {
    spinner
  },
  data() {
    return {
      isLoading: true
    }
  },
  created: async function() {
    if (localStorage.account && localStorage.sessionToken) {
      const account = await accountAPI.getMe().catch(function(err) {
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
  },
  methods: {
    pushSignalKeys: function() {
      // eslint-disable-next-line
      return wasmObject.then(() => {
        checkSignalKey()
      })
    }
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
