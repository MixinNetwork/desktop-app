<template>
  <div></div>
</template>
<script lang="ts">
import fs from 'fs'
import { ipcRenderer } from 'electron'
import store from '@/store/store'
import messageDao from '@/dao/message_dao'

import { Vue, Watch, Component } from 'vue-property-decorator'

@Component
export default class Task extends Vue {
  mounted() {
    ipcRenderer.on('taskRequestData', (event, payload) => {
      payload = JSON.parse(payload)
      const { action, messages } = payload
      if (action === 'delMedia') {
        let delNum = 0
        if (!messages) return
        messages.forEach((message: any) => {
          if (message && (message.path || message.media_url)) {
            const path = message.path || message.media_url.split('file://')[1]
            if (path && fs.existsSync(path)) {
              fs.unlink(path, () => {
                messageDao.deleteMessageById(message.mid)
                delNum++
                if (delNum >= messages.length) {
                  ipcRenderer.send('taskResponse', { action, cid: messages[0].cid })
                }
              })
            }
          }
        })
      }
    })
  }
}
</script>