<template>
  <div class="sign_in">
    <h1 v-show="!tempHide">{{$t('sign_in.title')}}</h1>
    <div v-show="!tempHide">{{$t('sign_in.desc')}}</div>
    <div class="qr_layout">
      <canvas id="qr" ref="qr"></canvas>
      <img class="logo" v-if="!isLoading" src="../assets/logo.png" />
      <spinner class="spinner" v-if="isLoading"></spinner>
      <div class="retry" v-if="showRetry" @click="refresh">
        <div class="button">
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g id="Page-1" fill="none" fill-rule="evenodd">
              <g fill="#FFF" fill-rule="nonzero">
                <path
                  d="M35.3 12.7C32.4 9.8 28.42 8 24 8 15.16 8 8.02 15.16 8.02 24S15.16 40 24 40c7.46 0 13.68-5.1 15.46-12H35.3c-1.64 4.66-6.08 8-11.3 8-6.62 0-12-5.38-12-12s5.38-12 12-12c3.32 0 6.28 1.38 8.44 3.56L26 22h14V8l-4.7 4.7z"
                  id="Shape"
                />
              </g>
            </g>
          </svg>
          <span class="text">{{$t('sign_in.reload')}}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// @ts-ignore
import QRious from 'qrious'
import interval from 'interval-promise'
// @ts-ignore
import platformInfo from 'platform'
import accountAPI from '@/api/account'
import signalAPI from '@/api/signal'
import signalProtocol from '@/crypto/signal'
import spinner from '@/components/Spinner.vue'
// @ts-ignore
import Bot from 'bot-api-js-client'
import signalDao from '@/crypto/signal_dao'
import { base64ToUint8Array } from '@/utils/util'
import { clearAllTables as clearMixin } from '@/persistence/db'
import { clearAllTables as clearSignal } from '@/persistence/signal_db'
import userDao from '@/dao/user_dao'
import conversationDao from '@/dao/conversation_dao'
import participantSessionDao from '@/dao/participant_session_dao'

import { Vue, Component } from 'vue-property-decorator'
import { generateKeys } from '@/utils/signal_key_util'

@Component({
  components: {
    spinner
  }
})
export default class SignIn extends Vue {
  provisioningCipher: any = Object
  keyPair: any = Object
  isLoading: any = true
  showRetry: any = true
  tempHide: any = false
  $electron: any

  mounted() {
    this.refresh()
  }

  refresh() {
    this.showRetry = false
    if (sessionStorage.readyToSignin) {
      this.signinAction()
      this.tempHide = true
      sessionStorage.readyToSignin = ''
      return
    }
    // @ts-ignore
    wasmObject.then(() => {
      this.keyPair = signalProtocol.generateKeyPair()
      const pubKey = base64ToUint8Array(this.keyPair.pub)
      const base64PubKey = encodeURIComponent(btoa(String.fromCharCode(...pubKey)))
      accountAPI
        .getProvisioningId(platformInfo.os.toString())
        .then((response: any) => {
          const deviceId = response.data.data.device_id
          const qrcodeUrl = 'mixin://device/auth?id=' + deviceId + '&pub_key=' + base64PubKey
          this.generateQrcode(qrcodeUrl)
          this.getSecret(deviceId)
          this.isLoading = false
        })
        .catch((e: any) => {
          this.showRetry = true
          this.isLoading = false
          console.log(e)
        })
    })
  }
  generateQrcode(url: string) {
    const qrious = new QRious({
      element: this.$refs.qr,
      backgroundAlpha: 0,
      foreground: '#00B0E9',
      level: 'H',
      size: 300
    })
    qrious.value = url
  }
  getSecret(deviceId: any) {
    interval(
      async(iteration: any, stop: any) => {
        await accountAPI
          .getProvisioning(deviceId)
          .then((resp: any) => {
            if (resp.data.data.secret) {
              stop()
              this.isLoading = true
              this.decryptProvision(resp.data.data.secret)
            }
          })
          .catch((e: any) => {
            console.log(e)
          })
        if (iteration === 60) {
          this.showRetry = true
        }
      },
      1000,
      { iterations: 60 }
    )
  }
  decryptProvision(envelopeDecoded: any) {
    let messageStr = ''
    try {
      messageStr = signalProtocol.decryptProvision(this.keyPair.priv, envelopeDecoded)
    } catch (e) {
      console.log('decryptProvision', e)
    }
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
    clearSignal()
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
      .then((resp: any) => {
        const account = resp.data.data
        localStorage.account = JSON.stringify(account)
        sessionStorage.signinData = JSON.stringify({
          sessionKeyPair,
          message,
          registrationId,
          primarySessionId,
          keyPair,
          account
        })
        sessionStorage.readyToSignin = true
        return location.reload()
        // if (!userDao.isMe(account.user_id)) {
        //   clearMixin()
        // }
      })
  }
  signinAction() {
    if (!sessionStorage.signinData) return
    const payload = JSON.parse(sessionStorage.signinData)
    sessionStorage.signinData = ''
    const { sessionKeyPair, message, registrationId, primarySessionId, keyPair, account } = payload
    localStorage.sessionToken = sessionKeyPair.private
    localStorage.primaryPlatform = message.platform
    signalProtocol.storeIdentityKeyPair(registrationId, keyPair.pub, keyPair.priv)
    this.pushSignalKeys().then((resp: any) => {
      const deviceId = signalProtocol.convertToDeviceId(account.session_id)
      localStorage.deviceId = deviceId
      localStorage.primarySessionId = primarySessionId
      localStorage.sessionId = account.session_id
      localStorage.newVersion = true
      this.$store.dispatch('saveAccount', account)
      this.updateParticipantSession(account.user_id, account.session_id)
      this.$router.push('/')
    })
  }
  pushSignalKeys() {
    // @ts-ignore
    return wasmObject.then(() => {
      const body = generateKeys()
      return signalAPI.postSignalKeys(body)
    })
  }
  updateParticipantSession(userId: string, sessionId: string) {
    const s = conversationDao.getConversationsByUserId(userId)
    if (!s || s.length === 0) {
      return
    }
    participantSessionDao.insertAll(
      s.map((item: any) => {
        return {
          conversation_id: item.conversation_id,
          user_id: userId,
          session_id: sessionId,
          sent_to_server: 0,
          created_at: new Date().toISOString()
        }
      })
    )
  }
}
</script>

<style lang="scss" scoped>
h1 {
  font-size: 0.95rem;
}

.sign_in {
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.qr_layout {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 15rem;
  height: 15rem;
}

.retry {
  z-index: 10;
  width: 15rem;
  height: 15rem;
  background: rgba(#ffffff, 0.8);
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  .button {
    width: 11rem;
    height: 11rem;
    border-radius: 6.5rem;
    background: #3a7ee4;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    .text {
      color: white;
      font-weight: 600;
      margin-top: 1rem;
      font-size: 0.8rem;
    }
  }
}

.spinner {
  position: absolute;
}

.logo {
  position: absolute;
  width: 3.2rem;
  height: 3.2rem;
}
</style>
