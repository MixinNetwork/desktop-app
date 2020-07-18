<template>
  <div></div>
</template>
<script lang="ts">
import fs from 'fs'
import { ipcRenderer } from 'electron'
import store from '@/store/store'
import messageDao from '@/dao/message_dao'
import { DBDeleteLimit } from '@/utils/constants'

import { Vue, Watch, Component } from 'vue-property-decorator'

@Component
export default class Task extends Vue {
  deleteMessages(cid: any) {
    let messages = []
    try {
      messages = JSON.parse(localStorage.deletingMessages)
    } catch (error) {}

    let nextMessages: any = []
    if (messages.length > DBDeleteLimit) {
      nextMessages = messages.slice(DBDeleteLimit)
      messages = messages.slice(0, DBDeleteLimit)
    }
    if (messages.length < 1) {
      ipcRenderer.send('taskResponse', { action: 'delMedia', cid })
      return
    }
    const messageIds: any = []
    messages.forEach((item: any) => {
      messageIds.push(item.mid)
    })
    messageDao.deleteMessageByIds(messageIds)
    localStorage.deletingMessages = JSON.stringify(nextMessages)
    messages.forEach((message: any) => {
      if (message && message.path) {
        const path = message.path
        if (path && fs.existsSync(path)) {
          fs.unlinkSync(path)
        }
      }
    })
    setTimeout(() => {
      this.deleteMessages(cid)
    }, 500)
  }

  mounted() {
    this.deleteMessages('')
    ipcRenderer.on('taskRequestData', (event, payload) => {
      payload = JSON.parse(payload)
      const { action, messages } = payload
      if (action === 'delMedia') {
        let final = []
        try {
          final = JSON.parse(localStorage.deletingMessages)
        } catch (error) {}
        const ids: any = []
        final.forEach((item: any) => {
          ids.push(item.mid)
        })
        messages.forEach((item: any) => {
          if (ids.indexOf(item.mid) < 0) {
            final.push(item)
          }
        })
        localStorage.deletingMessages = JSON.stringify(final)
        this.deleteMessages(messages[0].cid)
      }
    })
  }
}
</script>