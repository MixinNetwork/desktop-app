<template>
  <div class="loading">
    <spinner v-if="isLoading" />
    <h4>{{$t('loading.initializing')}}</h4>
  </div>
</template>

<script lang="ts">
import spinner from '@/components/Spinner.vue'
import accountAPI from '@/api/account'
import circleApi from '@/api/circle'
import circleDao from '@/dao/circle_dao'
import circleConversationDao from '@/dao/circle_conversation_dao'
import userAPI from '@/api/user'
import { checkSignalKey } from '@/utils/signal_key_util'
import { clearDb, dbMigration, getIdentityNumber } from '@/persistence/db_util'

import { Vue, Component } from 'vue-property-decorator'

import { remote } from 'electron'
import fs from 'fs'
import path from 'path'

import { mediaMigration } from '@/utils/attachment_util'

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
      userAPI.updateSession({ platform: 'Desktop', app_version: this.$electron.remote.app.getVersion() }).then(() => {})
      this.pushSignalKeys().then(() => {
        const user = account.data.data
        if (user) {
          localStorage.account = JSON.stringify(user)
          this.$store.dispatch('insertUser', user)
          this.$blaze.connect()
          if (!localStorage.circleSynced) {
            this.syncCircles()
          }
          this.migrationAction()
          this.$router.push('/home')
        }
      })
    }
  }

  async migrationAction() {
    const identityNumber = getIdentityNumber(true)
    if (identityNumber) {
      const newDir = path.join(remote.app.getPath('userData'), identityNumber)
      const oldMediaDir = path.join(remote.app.getPath('userData'), 'media')
      if (fs.existsSync(newDir) && !fs.existsSync(oldMediaDir)) {
        localStorage.newUserDirExist = true
        return
      }
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir)
      }

      await dbMigration(identityNumber)
      mediaMigration(identityNumber)

      localStorage.newUserDirExist = true
    }
  }

  getCircleConversations(circleId: any, list: any, offset: string) {
    return circleApi.getCircleConversations(circleId, offset).then(res => {
      if (!res.data || !res.data.data) return
      const conversations = res.data.data
      conversations.forEach((item: any) => {
        list.push(item)
      })
      if (conversations.length < 500) {
        circleConversationDao.insertUpdate(list)
        return
      }
      offset = conversations[0].created_at
      this.getCircleConversations(circleId, list, offset)
    })
  }

  syncCircles() {
    circleApi.getCircles().then(res => {
      if (!res.data || !res.data.data) return
      const circles = res.data.data
      if (!circles.length) return
      circles.forEach((circle: any) => {
        circleDao.insertUpdate(circle)
        this.getCircleConversations(circle.circle_id, [], '')
      })
      localStorage.circleSynced = true
    })
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
