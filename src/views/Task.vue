<template>
  <div></div>
</template>
<script lang="ts">
import fs from 'fs'
import { ipcRenderer } from 'electron'
import store from '@/store/store'
import messageDao from '@/dao/message_dao'
import conversationDao from '@/dao/conversation_dao'
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
    })
  }

  conversationClear(mids: any, conversationId: any) {
    const curMids = mids.slice(0, DBDeleteLimit)
    mids = mids.slice(DBDeleteLimit)
    messageDao.deleteMessageByIds(curMids)
    if (mids.length > 0) {
      setTimeout(() => {
        this.conversationClear(mids, conversationId)
      })
    } else {
      conversationDao.deleteConversation(conversationId)
    }
  }

  mounted() {
    this.deleteMessages('')
    ipcRenderer.on('taskRequestData', (event, payload) => {
      payload = JSON.parse(payload)
      const { action, messages, conversationId } = payload
      if (action === 'delMedia' && messages) {
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
        if (messages[0]) {
          this.deleteMessages(messages[0].cid)
        }
      }
      if (action === 'conversationClear') {
        messageDao.ftsMessagesDelete(conversationId)

        const findMessages = messageDao.findConversationMessageIds(conversationId)
        const mids: any = []
        findMessages.forEach((item: any) => {
          mids.push(item.message_id)
        })

        this.conversationClear(mids, conversationId)
      }
    })
  }
}
</script>