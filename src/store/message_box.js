import messageDao from '@/dao/message_dao.js'

class MessageBox {
  setConversationId(conversationId) {
    if (conversationId && this.conversationId !== conversationId) {
      this.page = 0
      this.conversationId = conversationId
      this.messages = messageDao.getMessages(conversationId, 0)
      this.count = messageDao.getMessagesCount(conversationId)['count(m.message_id)']
      this.scrollAction(true)
    }
  }
  refreshMessage(conversationId) {
    if (conversationId === this.conversationId && this.conversationId) {
      this.page = 0
      this.messages = messageDao.getMessages(conversationId, 0)
      this.callback(this.messages)
      let count = messageDao.getMessagesCount(conversationId)['count(m.message_id)']
      if (count >= this.count) {
        this.scrollAction(false)
      }
      this.count = count
    }
  }
  nextPage() {
    let self = this
    return new Promise(function(resolve) {
      let data = messageDao.getMessages(self.conversationId, ++self.page)
      if (data.length > 0) {
        setTimeout(function() {
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
