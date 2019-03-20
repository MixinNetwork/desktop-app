<template>
  <div class="sign_in">
    <h1>{{$t('sign_in.title')}}</h1>
    <div>{{$t('sign_in.desc')}}</div>
    <div class="qr_layout">
      <canvas id="qr" ref="qr"></canvas>
      <img class="logo" v-if="!isLoading" src="../assets/logo.png">
      <spinner class="spinner" v-if="isLoading"></spinner>
      <div class="retry" v-if="showRetry" @click="refresh">
        <div class="button">
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g id="Page-1" fill="none" fill-rule="evenodd">
              <g id="ic_refresh_black_24px" fill="#FFF" fill-rule="nonzero">
                <path
                  d="M35.3 12.7C32.4 9.8 28.42 8 24 8 15.16 8 8.02 15.16 8.02 24S15.16 40 24 40c7.46 0 13.68-5.1 15.46-12H35.3c-1.64 4.66-6.08 8-11.3 8-6.62 0-12-5.38-12-12s5.38-12 12-12c3.32 0 6.28 1.38 8.44 3.56L26 22h14V8l-4.7 4.7z"
                  id="Shape"
                ></path>
              </g>
            </g>
          </svg>
          <span class="text">{{$t('sign_in.reload')}}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import QRious from 'qrious'
import interval from 'interval-promise'
import platformInfo from 'platform'
import accountAPI from '@/api/account.js'
import signalAPI from '@/api/signal.js'
import signalProtocol from '@/crypto/signal.js'
import spinner from '@/components/Spinner.vue'
import Bot from 'bot-api-js-client'
import signalDao from '@/crypto/signal_dao.js'
import { base64ToUint8Array } from '@/utils/util.js'
import { clearAllTables as clearMixin } from '@/persistence/db'
import userDao from '@/dao/user_dao'
export default {
  components: {
    spinner
  },
  data() {
    return {
      provisioningCipher: Object,
      keyPair: Object,
      isLoading: true,
      showRetry: true
    }
  },
  mounted: function() {
    this.refresh()
  },
  methods: {
    refresh: function() {
      this.showRetry = false
      // eslint-disable-next-line no-undef
      wasmObject.then(result => {
        this.keyPair = signalProtocol.generateKeyPair()
        const pubKey = base64ToUint8Array(this.keyPair.pub)
        const base64PubKey = encodeURIComponent(btoa(String.fromCharCode(...pubKey)))
        accountAPI
          .getProvisioningId(platformInfo.os.toString())
          .then(response => {
            const deviceId = response.data.data.device_id
            const qrcodeUrl = 'mixin://device/auth?uuid=' + deviceId + '&pub_key=' + base64PubKey
            this.generateQrcode(qrcodeUrl)
            this.getSecret(deviceId)
            this.isLoading = false
          })
          .catch(e => {
            this.showRetry = true
            this.isLoading = false
            console.log(e)
          })
      })
    },
    generateQrcode: function(url) {
      const qrious = new QRious({
        element: this.$refs.qr,
        backgroundAlpha: 0,
        foreground: '#00B0E9',
        level: 'H',
        size: 300
      })
      qrious.value = url
    },
    getSecret: function(deviceId) {
      interval(
        async (iteration, stop) => {
          await accountAPI
            .getProvisioning(deviceId)
            .then(resp => {
              if (resp.data.data.secret) {
                stop()
                this.isLoading = true
                this.decryptProvision(resp.data.data.secret)
              }
            })
            .catch(e => {
              console.log(e)
            })
          if (iteration === 60) {
            this.showRetry = true
          }
        },
        1000,
        { iterations: 60 }
      )
    },
    decryptProvision: function(envelopeDecoded) {
      const messageStr = signalProtocol.decryptProvision(this.keyPair.priv, envelopeDecoded)
      if (!messageStr) {
        this.showRetry = true
        return
      }
      const message = JSON.parse(messageStr)
      const keyPair = signalProtocol.createKeyPair(message.identity_key_private)
      const code = message.provisioning_code
      const userId = message.user_id
      const primarySessionId = message.session_id
      const platform = 'Desktop'
      const purpose = 'SESSION'
      const platformVersion = platformInfo.os.toString()
      const appVersion = this.$electron.remote.app.getVersion()
      const registrationId = signalProtocol.generateRegId()
      const sessionKeyPair = new Bot().generateSessionKeypair()
      accountAPI
        .verifyProvisioning({
          code: code,
          user_id: userId,
          session_id: primarySessionId,
          platform: platform,
          platform_version: platformVersion,
          app_version: appVersion,
          purpose: purpose,
          registration_id: registrationId,
          session_secret: sessionKeyPair.public
        })
        .then(resp => {
          const account = resp.data.data
          localStorage.account = JSON.stringify(account)
          if (!userDao.isMe(account.user_id)) {
            clearMixin()
          }
          localStorage.sessionToken = sessionKeyPair.private
          localStorage.primaryPlatform = message.platform
          signalProtocol.storeIdentityKeyPair(registrationId, keyPair.pub, keyPair.priv)
          this.pushSignalKeys().then(resp => {
            const deviceId = signalProtocol.convertToDeviceId(account.session_id)
            localStorage.deviceId = deviceId
            localStorage.primarySessionId = primarySessionId
            this.$store.dispatch('saveAccount', account)
            this.$router.push('/')
          })
        })
    },
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
h1 {
  font-size: 1.2rem;
}

.sign_in {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.qr_layout {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 300px;
  height: 300px;
}

.retry {
  z-index: 10;
  width: 300px;
  height: 300px;
  background: rgba(#ffffff, 0.8);
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  .button {
    width: 220px;
    height: 220px;
    border-radius: 130px;
    background: #5bbaa6;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    .text {
      color: white;
      font-weight: 600;
      margin-top: 20px;
      font-size: 16px;
    }
  }
}

.spinner {
  position: absolute;
}

.logo {
  position: absolute;
  width: 64px;
  height: 64px;
}
</style>
