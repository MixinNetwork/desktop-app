import messageDao from '@/dao/message_dao.js'

class MessageBox {
  setConversationId(conversationId) {
    if (conversationId && this.conversationId !== conversationId) {
      this.page = 0
      this.conversationId = conversationId
      this.messages = messageDao.getMessages(conversationId, 0)
    }
  }
  refreshMessage(conversationId) {
    if (conversationId === this.conversationId && this.conversationId) {
      this.page = 0
      this.messages = messageDao.getMessages(conversationId, 0)
      this.callback(this.messages)
    }
  }
  nextPage() {
    let data = messageDao.getMessages(this.conversationId, ++this.page)
    if (data.length > 0) {
      return data
    } else {
      return null
    }
  }
  bindData(callback) {
    this.callback = callback
  }
}

export default new MessageBox()
