<template>
  <div class="loading">
    <spinner v-if="isLoading"/>
    <h4>{{$t('loading.initializing')}}</h4>
  </div>
</template>

<script>
import spinner from '@/components/Spinner.vue'
import accountAPI from '@/api/account.js'
import signalAPI from '@/api/signal.js'
import signalProtocol from '@/crypto/signal.js'
import signalDao from '@/crypto/signal_dao.js'
import { clearDb } from '@/persistence/db_util.js'

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
      const user = account.data.data
      if (user) {
        this.$store.dispatch('insertUser', user)
        this.$blaze.connect()
        this.$router.push('/home')
      }
    }
  },
  methods: {
    pushSignalKeys: function() {
      // eslint-disable-next-line no-undef
      return wasmObject.then(result => {
        const identityKeyPair = signalDao.getIdentityKeyPair()
        const preKeys = signalProtocol.generatePreKeys()
        const signedPreKey = signalProtocol.generateSignedPreKey()
        let otpks = []
        for (let i in preKeys) {
          const p = JSON.parse(preKeys[i].record)
          otpks.push({ key_id: p.ID, pub_key: p.PublicKey })
        }
        const body = {
          identity_key: identityKeyPair.public_key,
          signed_pre_key: {
            key_id: signedPreKey.ID,
            pub_key: signedPreKey.PublicKey,
            signature: signedPreKey.Signature
          },
          one_time_pre_keys: otpks
        }
        return signalAPI.postSignalKeys(body)
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
