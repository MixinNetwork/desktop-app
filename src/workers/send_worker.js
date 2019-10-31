import messageDao from '@/dao/message_dao'
import conversationDao from '@/dao/conversation_dao'
import participantDao from '@/dao/participant_dao'
import participantSessionDao from '@/dao/participant_session_dao'
import conversationApi from '@/api/conversation'
import uuidv4 from 'uuid/v4'
import signalProtocol from '@/crypto/signal.js'
import Vue from 'vue'
import BaseWorker from './base_worker'
import store from '@/store/store'
import { ConversationStatus, ConversationCategory, MessageStatus, MessageCategories } from '@/utils/constants.js'

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
      const result = await conversationApi.createContactConversation(body).catch(err => {
        if (err.data.error) {
          const messageId = message.message_id
          const status = 'PENDING'
          store.dispatch('makeMessageStatus', { messageId, status })
        }
      })

      if (result.data.data) {
        conversationDao.updateConversationStatusById(conversation.conversation_id, ConversationStatus.SUCCESS)
        const participants = result.data.data.participants
        if (participants) {
          participantDao.insertAll(
            participants.map(item => {
              return {
                conversation_id: conversation.conversation_id,
                user_id: item.user_id,
                role: item.role,
                created_at: item.created_at
              }
            })
          )
        }
        const session = result.data.data.participant_sessions
        if (session) {
          const participants = session.map(function(item) {
            return {
              conversation_id: item.conversation_id,
              user_id: item.user_id,
              session_id: item.session_id,
              sent_to_server: null,
              created_at: new Date().toISOString()
            }
          })
          participantSessionDao.insertAll(participants)
        }
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
    let content = message.content
    if (message.category === MessageCategories.PLAIN_TEXT) {
      content = btoa(unescape(encodeURIComponent(message.content)))
    }
    const blazeMessage = this.createBlazeMessage(message, content)
    await Vue.prototype.$blaze.sendMessagePromise(blazeMessage)
  }

  async sendSignalMessage(message) {
    // eslint-disable-next-line no-undef
    await wasmObject.then(result => {})

    if (message.resend_status) {
      if (message.resend_status === 1) {
        if (await this.checkSignalSession(message.resend_user_id, message.resend_session_id)) {
          await this.deliver(message, this.encryptNormalMessage(message))
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
      data: data,
      quote_message_id: message.quote_message_id
    }
    const blazeMessage = {
      id: uuidv4(),
      action: 'CREATE_MESSAGE',
      params: blazeParam
    }
    return blazeMessage
  }

  async checkSessionSenderKey(conversationId) {
    const participants = participantSessionDao.getNotSendSessionParticipants(conversationId, this.getAccountId())
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
        let { cipherText, err } = signalProtocol.encryptSenderKey(
          conversationId,
          participant.user_id,
          signalProtocol.convertToDeviceId(participant.session_id),
          this.getAccountId(),
          this.getDeviceId()
        )
        if (err) {
          requestSignalKeyUsers.push({ user_id: participant.user_id, session_id: participant.session_id })
        } else {
          // Todo senderKeyId
          signalKeyMessages.push({
            message_id: uuidv4().toLowerCase(),
            recipient_id: participant.userId,
            data: cipherText,
            session_id: participant.sessionId
          })
        }
      }
    })

    if (requestSignalKeyUsers.length !== 0) {
      // createConsumeSessionSignalKeys
      const blazeMessage = {
        id: uuidv4(),
        action: 'CONSUME_SESSION_SIGNAL_KEYS',
        params: {
          recipients: requestSignalKeyUsers
        }
      }
      const data = await Vue.prototype.$blaze.sendMessagePromise(blazeMessage)
      if (data) {
        const signalKeys = data
        const keys = []
        if (signalKeys.length === 0) {
          // No any group signal key from server
        }
        signalKeys.forEach(signalKey => {
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

        const noKeyList = requestSignalKeyUsers.filter(signalKey => {
          return !keys.some(key => key === signalKey)
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
          participantSessionDao.updateList(sentSendKeys)
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
      params: { conversation_id: conversationId, messages: signalKeyMessages }
    }
    const result = await Vue.prototype.$blaze.sendMessagePromise(bm)
    if (result) {
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
    }
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
      // Todo Need check
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
