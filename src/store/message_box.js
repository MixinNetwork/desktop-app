import messageDao from '@/dao/message_dao.js'

class MessageBox {
  setConversationId(conversationId) {
    if (conversationId && this.conversationId !== conversationId) {
      this.conversationId = conversationId
      this.messages = messageDao.getMessages(conversationId)
    }
  }
  refreshMessage(conversationId) {
    if (conversationId === this.conversationId && this.conversationId) {
      this.messages = messageDao.getMessages(conversationId)
    }
  }
}

export default new MessageBox()
