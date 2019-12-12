import messageDao from '@/dao/message_dao.js'

class MessageBox {
  setConversationId(conversationId, unseenMessageCount) {
    if (conversationId && this.conversationId !== conversationId) {
      this.conversationId = conversationId
      const prePageMessageCount = 5
      let page = 0
      if (unseenMessageCount > prePageMessageCount) {
        page = Math.ceil(unseenMessageCount / prePageMessageCount)
      }
      let currPage = page
      let messages = []
      while (currPage > 0) {
        messages = messages.concat(messageDao.getMessages(conversationId, currPage))
        currPage--
      }
      messages = messages.concat(messageDao.getMessages(conversationId, 0))
      this.messages = messages
      this.page = page

      this.count = messageDao.getMessagesCount(conversationId)['count(m.message_id)']
      this.scrollAction(true)
    }
  }
  refreshMessage(conversationId) {
    if (conversationId === this.conversationId && this.conversationId) {
      this.page = 0
      const lastMessages = messageDao.getMessages(conversationId, 0)
      const newMessages = []
      const lastMsgLen = lastMessages.length
      for (let i = lastMsgLen - 1; i >= 0; i--) {
        const temp = lastMessages[i]
        if (temp.messageId === this.messages[this.messages.length - 1].messageId) {
          break
        }
        newMessages.unshift(temp)
      }
      this.messages = this.messages.concat(newMessages)
      for (let i = 1; i <= lastMsgLen; i++) {
        this.messages[this.messages.length - i].status = lastMessages[lastMsgLen - i].status
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
  nextPage() {
    let self = this
    return new Promise(function (resolve) {
      let data = messageDao.getMessages(self.conversationId, ++self.page)
      if (data.length > 0) {
        setTimeout(function () {
          resolve(data)
        }, 150)
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
