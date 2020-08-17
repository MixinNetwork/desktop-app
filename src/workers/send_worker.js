import messageDao from '@/dao/message_dao'
import userDao from '@/dao/user_dao'
import jobDao from '@/dao/job_dao'
import conversationDao from '@/dao/conversation_dao'
import participantSessionDao from '@/dao/participant_session_dao'
import resendMessageDao from '@/dao/resend_message_dao'
import { v4 as uuidv4 } from 'uuid'
import signalProtocol from '@/crypto/signal'
import Vue from 'vue'
import BaseWorker from './base_worker'
import { MessageStatus, MessageCategories, messageType } from '@/utils/constants'
import contentUtil from '@/utils/content_util'

class SendWorker extends BaseWorker {
  async doWork() {
    const sendingMessageJob = jobDao.findSendingJob()
    if (!sendingMessageJob) {
      return
    }
    const { messageId } = JSON.parse(sendingMessageJob.blaze_message)
    const message = messageDao.getSendingMessage(messageId)
    if (!message) {
      jobDao.delete([sendingMessageJob])
      return
    }

    let recipientId = ''
    let mentions
    if (messageType(message.category) === 'text') {
      const botNumber = contentUtil.getBotNumber(message.content)
      if (botNumber) {
        const recipient = userDao.findUserIdByAppNumber(message.conversation_id, botNumber)
        if (recipient && recipient.user_id) {
          recipientId = recipient.user_id
          message.category = 'PLAIN_TEXT'
        }
      } else {
        mentions = this.getMentionParam(message.content)
      }
    }
    let result = false
    if (message.category === 'APP_CARD' || message.category.startsWith('PLAIN_')) {
      result = await this.sendPlainMessage(message, recipientId, mentions)
    } else {
      result = await this.sendSignalMessage(message, mentions)
    }
    if (result) {
      jobDao.delete([sendingMessageJob])
    }
  }

  async sendPlainMessage(message, recipientId, mentions) {
    const conversation = conversationDao.getConversationById(message.conversation_id)
    await this.checkConversationExist(conversation)
    let content = message.content
    if (
      message.category === MessageCategories.APP_CARD ||
      message.category === MessageCategories.PLAIN_TEXT ||
      message.category === MessageCategories.PLAIN_POST
    ) {
      content = btoa(unescape(encodeURIComponent(message.content)))
    }
    const blazeMessage = this.createBlazeMessage(message, content, recipientId, mentions)
    const result = await this.deliver(message, blazeMessage)
    return result
  }

  async sendSignalMessage(message, mentions) {
    // eslint-disable-next-line no-undef
    await wasmObject.then(result => {})

    if (message.resend_status) {
      if (message.resend_status === 1) {
        if (await this.checkSignalSession(message.resend_user_id, message.resend_session_id)) {
          const bm = this.encryptNormalMessage(message, mentions)
          if (bm) {
            const result = await this.deliver(message, bm)
            if (result) {
              resendMessageDao.deleteResendMessageByMessageId(message.message_id)
            }
          }
        }
      }
      return
    }

    if (!signalProtocol.isExistSenderKey(message.conversation_id, this.getAccountId(), this.getDeviceId())) {
      await this.checkConversation(message.conversation_id)
    }

    await this.checkSessionSenderKey(message.conversation_id)
    const bm = this.encryptNormalMessage(message, mentions)
    if (bm) {
      const result = await this.deliver(message, bm)
      return result
    }
    return true
  }

  encryptNormalMessage(message, mentions) {
    if (message.resend_status && message.resend_status === 1) {
      const content = signalProtocol.encryptSessionMessage(
        message.resend_user_id,
        signalProtocol.convertToDeviceId(message.resend_session_id),
        message.content,
        message.message_id
      )
      return this.createBlazeMessage(message, content, message.resend_user_id, mentions)
    } else {
      const content = signalProtocol.encryptGroupMessage(
        message.conversation_id,
        this.getAccountId(),
        this.getDeviceId(),
        message.content
      )
      if (!content) {
        console.log('encrypt group message failed, empty data')
        return
      }
      return this.createBlazeMessage(message, content, null, mentions)
    }
  }

  async deliver(message, blazeMessage) {
    const self = this
    let result = false
    await Vue.prototype.$blaze.sendMessagePromise(blazeMessage).then(
      _ => {
        result = true
      }
    ).catch(async error => {
      if (error.code === 20140) {
        console.log('send message checksum failed')
        await self.refreshConversation(message.conversation_id)
        console.log('refresh end')
      } else if (error === 'Time out') {
        throw error
      } else if (error.code === 403) {
        console.log('deliver 403')
        messageDao.updateMessageStatusById(MessageStatus.SENT, message.message_id)
        result = true
      } else {
        console.log(error)
      }
    })
    return result
  }

  createBlazeMessage(message, data, recipientId, mentions) {
    const blazeParam = {
      conversation_id: message.conversation_id,
      message_id: message.message_id,
      category: message.category,
      data: data,
      quote_message_id: message.quote_message_id
    }
    if (message.resend_user_id) {
      blazeParam.message_id = uuidv4()
      blazeParam.recipient_id = message.resend_user_id
      blazeParam.session_id = message.resend_session_id
    } else {
      blazeParam.conversation_checksum = this.getCheckSum(message.conversation_id)
    }
    if (recipientId) {
      blazeParam.recipient_id = recipientId
    }
    if (mentions) {
      blazeParam.mentions = mentions
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
      const data = await Vue.prototype.$blaze.sendMessagePromise(blazeMessage).catch(error => {
        if (error === 'Time out') {
          throw error
        }
      })
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
    await Vue.prototype.$blaze.sendMessagePromise(bm).then(
      _ => {
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
      },
      async error => {
        if (error.code === 20140) {
          console.log('checkSessionSenderKey checksum failed')
          await self.refreshConversation(conversationId)
          await self.checkSessionSenderKey(conversationId)
        } else if (error === 'Time out') {
          throw error
        } else {
          console.log(error)
        }
      }
    )
  }

  async checkSignalSession(recipientId, sessionId) {
    const deviceId = signalProtocol.convertToDeviceId(sessionId)
    if (!signalProtocol.containsSession(recipientId, deviceId)) {
      const blazeMessage = {
        id: uuidv4(),
        action: 'CONSUME_SESSION_SIGNAL_KEYS',
        params: {
          recipients: [{ user_id: recipientId, session_id: sessionId }]
        }
      }
      const data = await Vue.prototype.$blaze.sendMessagePromise(blazeMessage).catch(error => {
        if (error === 'Time out') {
          throw error
        }
      })
      if (data && data.length > 0) {
        const key = data[0]
        signalProtocol.processSession(key.user_id, deviceId, JSON.stringify(key))
      } else {
        return false
      }
    }
    return true
  }

  getMentionParam(content) {
    if (!content) return null
    const numbers = contentUtil.parseMentionIdentityNumber(content)
    if (numbers.length === 0) {
      return null
    }
    const mentionIds = new Set()
    const mentions = userDao.findUsersByIdentityNumber(numbers)
    mentions.forEach(user => {
      if (user) {
        mentionIds.add(user.user_id)
      }
    })
    return Array.from(mentionIds)
  }
}

export default new SendWorker()
