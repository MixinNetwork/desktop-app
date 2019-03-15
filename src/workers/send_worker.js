import messageDao from '@/dao/message_dao'
import conversationDao from '@/dao/conversation_dao'
import conversationApi from '@/api/conversation'
import uuidv4 from 'uuid/v4'
import signalProtocol from '@/crypto/signal.js'
import Vue from 'vue'
import BaseWorker from './base_worker'
import { ConversationStatus, ConversationCategory, MessageStatus } from '@/utils/constants.js'

class SendWorker extends BaseWorker {
  async doWork() {
    const message = messageDao.getSendingMessages()
    if (!message) {
      return
    }
    const conversation = conversationDao.getConversationById(message.conversation_id)
    if (
      conversation &&
      conversation.category === ConversationCategory.CONTACT &&
      conversation.status === ConversationStatus.START
    ) {
      const body = {
        conversation_id: conversation.conversation_id,
        category: conversation.category,
        participants: [{ user_id: conversation.owner_id }]
      }
      const result = await conversationApi.createContactConversation(body)
      if (result.data.data) {
        conversationDao.updateConversationStatusById(conversation.conversation_id, ConversationStatus.SUCCESS)
      } else {
        return
      }
    }
    if (message.category.startsWith('PLAIN_')) {
      await this.sendPlainMessage(message)
    } else {
      await this.sendSignalMessage(message)
    }
  }

  async sendPlainMessage(message) {
    const content = btoa(unescape(encodeURIComponent(message.content)))
    const blazeMessage = this.createBlazeMessage(message, content)
    await Vue.prototype.$blaze.sendMessagePromise(blazeMessage)
  }

  async sendSignalMessage(message) {
    // eslint-disable-next-line no-undef
    await wasmObject.then(result => {})
    const primaryDeviceId = 1
    if (!signalProtocol.containsSession(message.user_id, primaryDeviceId)) {
      const blazeParam = {
        recipients: [{ user_id: message.user_id, session_id: localStorage.primarySessionId }]
      }
      const blazeMessage = {
        id: uuidv4(),
        action: 'CONSUME_SESSION_SIGNAL_KEYS',
        params: blazeParam
      }
      const data = await Vue.prototype.$blaze.sendMessagePromise(blazeMessage)
      if (data && data.length > 0) {
        signalProtocol.processSession(message.user_id, primaryDeviceId, JSON.stringify(data[0]))
      } else {
        console.log('----NO Signal Keys----')
        return
      }
    }

    const content = signalProtocol.encryptSessionMessage(message.user_id, primaryDeviceId, message.content)
    const blazeMessage = this.createBlazeMessage(message, content)
    await Vue.prototype.$blaze.sendMessagePromise(blazeMessage).then(
      _ => {},
      error => {
        if (error.code === 403) {
          messageDao.updateMessageStatusById(MessageStatus.PENDING, message.message_id)
        } else {
          console.log(error)
        }
      }
    )
  }

  createBlazeMessage(message, data) {
    const blazeParam = {
      conversation_id: message.conversation_id,
      message_id: message.message_id,
      category: message.category,
      recipient_id: message.user_id,
      session_id: localStorage.primarySessionId,
      data: data,
      quote_message_id: message.quote_message_id
    }
    const blazeMessage = {
      id: uuidv4(),
      action: 'CREATE_SESSION_MESSAGE',
      params: blazeParam
    }
    return blazeMessage
  }
}

export default new SendWorker()
