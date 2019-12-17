import messageDao from '@/dao/message_dao'
import conversationDao from '@/dao/conversation_dao'
import participantSessionDao from '@/dao/participant_session_dao'
import resendMessageDao from '@/dao/resend_message_dao'
import uuidv4 from 'uuid/v4'
import signalProtocol from '@/crypto/signal.js'
import Vue from 'vue'
import BaseWorker from './base_worker'
import { MessageStatus, MessageCategories } from '@/utils/constants.js'

class SendWorker extends BaseWorker {
  async doWork() {
    const message = messageDao.getSendingMessages()
    if (!message) {
      return
    }
    if (message.category.startsWith('PLAIN_')) {
      await this.sendPlainMessage(message)
    } else {
      await this.sendSignalMessage(message)
    }
  }

  async sendPlainMessage(message) {
    const conversation = conversationDao.getConversationById(message.conversation_id)
    await this.checkConversationExist(conversation)
    let content = message.content
    if (message.category === MessageCategories.PLAIN_TEXT) {
      content = btoa(unescape(encodeURIComponent(message.content)))
    }
    const blazeMessage = this.createBlazeMessage(message, content)
    await Vue.prototype.$blaze.sendMessagePromise(blazeMessage)
  }

  async sendSignalMessage(message) {
    // eslint-disable-next-line no-undef
    await wasmObject.then(result => { })

    if (message.resend_status) {
      if (message.resend_status === 1) {
        if (await this.checkSignalSession(message.resend_user_id, message.resend_session_id)) {
          const result = await this.deliver(message, this.encryptNormalMessage(message))
          if (result) {
            resendMessageDao.deleteResendMessageByMessageId(message.message_id)
          }
        }
      }
      return
    }

    if (!signalProtocol.isExistSenderKey(message.conversation_id, message.user_id, this.getDeviceId())) {
      await this.checkConversation(message.conversation_id)
    }

    await this.checkSessionSenderKey(message.conversation_id)
    await this.deliver(message, this.encryptNormalMessage(message))
  }

  encryptNormalMessage(message) {
    if (message.resend_status && message.resend_status === 1) {
      const content = signalProtocol.encryptSessionMessage(
        message.resend_user_id,
        signalProtocol.convertToDeviceId(message.resend_session_id),
        message.content
      )
      const blazeMessage = this.createBlazeMessage(message, content)
      return blazeMessage
    } else {
      const content = signalProtocol.encryptGroupMessage(
        message.conversation_id,
        message.user_id,
        this.getDeviceId(),
        message.content
      )
      const blazeMessage = this.createBlazeMessage(message, content)
      return blazeMessage
    }
  }

  async deliver(message, blazeMessage) {
    const self = this
    let result = false
    await Vue.prototype.$blaze.sendMessagePromise(blazeMessage).then(
      _ => {
        result = true
      },
      async error => {
        if (error.code === 20140) {
          await self.refreshConversation(message.conversation_id)
        } else if (error.code === 403) {
          messageDao.updateMessageStatusById(MessageStatus.SENT, message.message_id)
        } else {
          console.log(error)
        }
      })
    return result
  }

  createBlazeMessage(message, data) {
    const blazeParam = {
      conversation_id: message.conversation_id,
      message_id: message.message_id,
      category: message.category,
      data: data,
      quote_message_id: message.quote_message_id,
      conversation_checksum: this.getCheckSum(message.conversation_id),
      session_id: message.resend_session_id
    }
    const blazeMessage = {
      id: uuidv4(),
      action: 'CREATE_MESSAGE',
      params: blazeParam
    }
    return blazeMessage
  }

  async checkSessionSenderKey(conversationId) {
    const participants = participantSessionDao.getNotSendSessionParticipants(conversationId, this.getSessionId())
    if (!participants || participants.length === 0) {
      return
    }
    let requestSignalKeyUsers = []
    let signalKeyMessages = []
    participants.forEach(participant => {
      if (
        !signalProtocol.containsSession(participant.user_id, signalProtocol.convertToDeviceId(participant.session_id))
      ) {
        requestSignalKeyUsers.push({ user_id: participant.user_id, session_id: participant.session_id })
      } else {
        let cipherText = signalProtocol.encryptSenderKey(
          conversationId,
          participant.user_id,
          signalProtocol.convertToDeviceId(participant.session_id),
          this.getAccountId(),
          this.getDeviceId()
        )

        if (!cipherText) {
          requestSignalKeyUsers.push({ user_id: participant.user_id, session_id: participant.session_id })
        } else {
          signalKeyMessages.push({
            message_id: uuidv4().toLowerCase(),
            recipient_id: participant.user_id,
            data: cipherText,
            session_id: participant.session_id
          })
        }
      }
    })

    if (requestSignalKeyUsers.length !== 0) {
      const blazeMessage = {
        id: uuidv4(),
        action: 'CONSUME_SESSION_SIGNAL_KEYS',
        params: {
          recipients: requestSignalKeyUsers
        }
      }
      const data = await Vue.prototype.$blaze.sendMessagePromise(blazeMessage)
      if (data) {
        const keys = []
        if (data.length > 0) {
          data.forEach(signalKey => {
            // createPreKeyBundle
            signalProtocol.processSession(
              signalKey.user_id,
              signalProtocol.convertToDeviceId(signalKey.session_id),
              JSON.stringify(signalKey)
            )
            const cipherText = signalProtocol.encryptSenderKey(
              conversationId,
              signalKey.user_id,
              signalProtocol.convertToDeviceId(signalKey.session_id),
              this.getAccountId(),
              this.getDeviceId()
            )
            signalKeyMessages.push({
              message_id: uuidv4().toLowerCase(),
              recipient_id: signalKey.user_id,
              data: cipherText,
              session_id: signalKey.session_id
            })
            keys.push({ user_id: signalKey.user_id, session_id: signalKey.session_id })
          })
        }

        const noKeyList = requestSignalKeyUsers.filter(signalKey => {
          return !keys.some(key => key.session_id === signalKey.session_id)
        })
        if (noKeyList.length > 0) {
          const sentSendKeys = noKeyList.map(key => {
            return {
              conversation_id: conversationId,
              user_id: key.user_id,
              session_id: key.session_id,
              sent_to_server: 0,
              created_at: new Date().toISOString()
            }
          })
          participantSessionDao.insertAll(sentSendKeys)
        }
      }
    }
    if (signalKeyMessages.length === 0) {
      return
    }
    // createSignalKeyMessage
    const bm = {
      id: uuidv4(),
      action: 'CREATE_SIGNAL_KEY_MESSAGES',
      params: {
        conversation_id: conversationId,
        messages: signalKeyMessages,
        conversation_checksum: this.getCheckSum(conversationId)
      }
    }
    const self = this
    await Vue.prototype.$blaze.sendMessagePromise(bm).then(_ => {
      participantSessionDao.updateList(
        signalKeyMessages.map(key => {
          return {
            conversation_id: conversationId,
            user_id: key.recipient_id,
            session_id: key.session_id,
            sent_to_server: 1,
            created_at: new Date().toISOString()
          }
        })
      )
    }, async error => {
      if (error.code === 20140) {
        await self.refreshConversation(conversationId)
        await self.checkSessionSenderKey(conversationId)
      } else {
        console.log(error)
      }
    })
  }

  async checkSignalSession(recipientId, sessionId) {
    if (!signalProtocol.containsSession(recipientId, signalProtocol.convertToDeviceId(sessionId))) {
      const blazeMessage = {
        id: uuidv4(),
        action: 'CONSUME_SESSION_SIGNAL_KEYS',
        params: {
          recipients: [{ user_id: recipientId, session_id: sessionId }]
        }
      }
      const data = await Vue.prototype.$blaze.sendMessagePromise(blazeMessage)
      if (data && data.length > 0) {
        const key = data[0]
        signalProtocol.processSession(
          key.user_id,
          signalProtocol.convertToDeviceId(key.session_id),
          JSON.stringify(key)
        )
      } else {
        return false
      }
    }
    return true
  }
}

export default new SendWorker()
