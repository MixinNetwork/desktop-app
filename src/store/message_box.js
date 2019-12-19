import messageDao from '@/dao/message_dao.js'
import { PerPageMessageCount } from '@/utils/constants.js'

class MessageBox {
  setConversationId(conversationId, unseenMessageCount) {
    if (conversationId) {
      this.conversationId = conversationId
      const perPageCount = PerPageMessageCount
      let page = 0
      if (unseenMessageCount > perPageCount) {
        page = Math.ceil(unseenMessageCount / perPageCount)
      }
      this.messages = messageDao.getMessages(conversationId, page)
      this.page = page
      this.pageDown = page
      this.tempCount = 0

      this.count = messageDao.getMessagesCount(conversationId)['count(m.message_id)']
      this.scrollAction(true)
    }
  }
  refreshConversation(conversationId) {
    const page = 0
    this.page = page
    this.pageDown = page
    this.tempCount = 0
    this.messages = messageDao.getMessages(conversationId, page)
    this.callback(this.messages)
  }
  refreshMessage(conversationId) {
    if (conversationId === this.conversationId && this.conversationId) {
      const lastMessages = messageDao.getMessages(conversationId, 0)
      const newMessages = []
      const lastMsgLen = lastMessages.length
      for (let i = lastMsgLen - 1; i >= 0; i--) {
        const temp = lastMessages[i]
        const msgLen = this.messages.length
        if (temp && msgLen > 0 && temp.messageId === this.messages[msgLen - 1].messageId) {
          break
        }
        newMessages.unshift(temp)
      }
      this.messages = this.messages.concat(newMessages)
      this.tempCount += newMessages.length
      for (let i = 1; i <= lastMsgLen; i++) {
        this.messages[this.messages.length - i] = lastMessages[lastMsgLen - i]
      }
      this.callback(this.messages)
      let count = messageDao.getMessagesCount(conversationId)['count(m.message_id)']
      if (count >= this.count) {
        this.scrollAction(false)
      }
      this.count = count
    }
  }
  deleteMessages(messageIds) {
    messageDao.deleteMessagesById(messageIds)
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (messageIds[0] === this.messages[i].messageId) {
        this.messages.splice(i, 1)
        break
      }
    }
  }
  nextPage(direction) {
    return new Promise(resolve => {
      let data = []
      if (direction === 'down') {
        if (this.pageDown > 0) {
          data = messageDao.getMessages(this.conversationId, --this.pageDown, -this.tempCount)
        }
      } else {
        data = messageDao.getMessages(this.conversationId, ++this.page, this.tempCount)
      }
      if (data.length > 0) {
        setTimeout(() => {
          resolve(data)
        })
      } else {
        resolve(null)
      }
    })
  }
  bindData(callback, scrollAction) {
    this.callback = callback
    this.scrollAction = scrollAction
  }
  clearData(conversationId) {
    if (conversationId === this.conversationId && this.conversationId) {
      this.page = 0
      this.messages = []
      this.count = 0
    }
  }
}

export default new MessageBox()
