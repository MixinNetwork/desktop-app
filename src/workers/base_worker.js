import conversationDao from '@/dao/conversation_dao'
import participantDao from '@/dao/participant_dao'
import participantSessionDao from '@/dao/participant_session_dao'
import userDao from '@/dao/user_dao'
import appDao from '@/dao/app_dao'
import stickerDao from '@/dao/sticker_dao'
import messageDao from '@/dao/message_dao'
import stickerApi from '@/api/sticker'
import conversationApi from '@/api/conversation'
import userApi from '@/api/user'
import { ConversationStatus, ConversationCategory, SystemUser } from '@/utils/constants'
import { generateConversationChecksum } from '@/utils/util'
import store from '@/store/store'
import signalProtocol from '@/crypto/signal'
import uuidv4 from 'uuid/v4'
import Vue from 'vue'

export default class BaseWorker {
  async syncConversation(data) {
    if (
      data.conversation_id === SystemUser ||
      data.conversation_id === JSON.parse(localStorage.getItem('account')).user_id
    ) {
      return
    }
    let conversation = conversationDao.getConversationById(data.conversation_id)
    if (!conversation) {
      conversation = {
        conversation_id: data.conversation_id,
        owner_id: data.user_id,
        category: null,
        name: null,
        icon_url: null,
        announcement: '',
        code_url: '',
        pay_type: '',
        created_at: new Date().toISOString(),
        pin_time: null,
        last_message_id: null,
        last_read_message_id: null,
        unseen_message_count: 0,
        status: ConversationStatus.START,
        draft: null,
        mute_until: null
      }
      conversationDao.insertConversation(conversation)
      await this.refreshConversation(data.conversation_id)
    }
    if (conversation.status === ConversationStatus.START) {
      await this.refreshConversation(data.conversation_id)
    }
  }

  async ftsMessageLoadAll() {
    const count = messageDao.ftsMessageCount()
    if (!count) {
      const conversations = conversationDao.getConversations()
      conversations.forEach(conversation => {
        messageDao.ftsMessageLoad(conversation.conversationId)
      })
    }
  }

  async refreshConversation(conversationId) {
    const c = await conversationApi.getConversation(conversationId)
    if (c.data.data) {
      const conversation = c.data.data
      const me = JSON.parse(localStorage.getItem('account'))
      const result = conversation.participants.some(function(item) {
        return item.user_id === me.user_id
      })

      const status = result ? ConversationStatus.SUCCESS : ConversationStatus.QUIT
      let ownerId = conversation.creator_id
      if (conversation.category === ConversationCategory.CONTACT) {
        conversation.participants.forEach(function(item) {
          if (item.user_id !== me.user_id) {
            ownerId = item.user_id
          }
        })
      }
      conversationDao.updateConversation({
        conversation_id: conversation.conversation_id,
        owner_id: ownerId,
        category: conversation.category,
        name: conversation.name,
        announcement: conversation.announcement,
        created_at: conversation.created_at,
        status: status,
        mute_until: conversation.mute_until
      })
      await this.refreshParticipants(conversation.conversation_id, conversation.participants)
      await this.refreshParticipantsSession(conversation.conversation_id, conversation.participant_sessions)
      await this.syncUser(ownerId)
    }
  }

  async refreshParticipants(conversationId, participants) {
    const local = participantDao.getParticipants(conversationId)
    const localIds = local.map(function(item) {
      return item.user_id
    })
    var online = []
    participants.forEach(function(item, index) {
      online[index] = {
        conversation_id: conversationId,
        user_id: item.user_id,
        role: item.role,
        created_at: item.created_at
      }
    })

    const add = online.filter(function(item) {
      return !localIds.some(function(e) {
        return item.user_id === e
      })
    })
    const remove = localIds.filter(function(item) {
      return !online.some(function(e) {
        return item === e.user_id
      })
    })
    if (add.length > 0) {
      participantDao.insertAll(add)
      const needFetchUsers = add.map(function(item) {
        return item.user_id
      })
      this.fetchUsers(needFetchUsers)
    }
    if (remove.length > 0) {
      participantDao.deleteAll(conversationId, remove)
    }

    if (add.length > 0 || remove.length > 0) {
      store.dispatch('refreshParticipants', conversationId)
    }
  }

  async refreshParticipantsSession(conversationId, remote) {
    if (!remote) return
    const local = participantSessionDao.getParticipantsSession(conversationId)
    if (!local || local.length === 0) {
      const add = remote.map(function(item) {
        return {
          conversation_id: conversationId,
          user_id: item.user_id,
          session_id: item.session_id,
          sent_to_server: null,
          created_at: new Date().toISOString()
        }
      })

      participantSessionDao.insertList(add)
      return
    }
    const common = local.filter(function(item) {
      return remote.some(function(e) {
        return e.session_id === item.session_id && e.user_id === item.user_id
      })
    })

    const del = local.filter(function(item) {
      return !common.some(function(e) {
        return e.session_id === item.session_id && e.user_id === item.user_id
      })
    })
    const add = remote
      .filter(function(item) {
        return !common.some(function(e) {
          return e.session_id === item.session_id && e.user_id === item.user_id
        })
      })
      .map(function(item) {
        return {
          conversation_id: conversationId,
          user_id: item.user_id,
          session_id: item.session_id,
          sent_to_server: null,
          created_at: new Date().toISOString()
        }
      })

    participantSessionDao.deleteList(del)
    participantSessionDao.insertList(add)
  }

  async fetchUsers(users) {
    const resp = await userApi.getUsers(users)
    if (resp.data.data) {
      userDao.insertUsers(resp.data.data)
    }
  }

  async syncUser(userId) {
    let user = userDao.findUserById(userId)
    if (!user) {
      const response = await userApi.getUserById(userId)
      if (response.data.data) {
        user = response.data.data
        userDao.insertUser(user)
        appDao.insert(user.app)
      }
    }
    return user
  }

  async syncSession(conversationId, userIds) {
    const resp = await userApi.getSessions(userIds)
    if (resp.data.data) {
      const add = resp.data.data.map(function(item) {
        return {
          conversation_id: conversationId,
          user_id: item.user_id,
          session_id: item.session_id,
          sent_to_server: null,
          created_at: new Date().toISOString()
        }
      })
      participantSessionDao.insertList(add)
    }
  }

  async refreshSticker(stickerId) {
    const response = await stickerApi.getStickerById(stickerId)
    if (response.data.data) {
      stickerDao.insertUpdate(response.data.data)
    }
  }

  getDeviceId() {
    return parseInt(localStorage.deviceId)
  }

  getSessionId() {
    return localStorage.sessionId
  }

  getAccountId() {
    return JSON.parse(localStorage.getItem('account')).user_id
  }

  getCheckSum(conversationId) {
    const sessions = participantSessionDao.getParticipantSessionsByConversationId(conversationId)
    if (!sessions || sessions.length === 0) {
      return ''
    } else {
      return generateConversationChecksum(sessions)
    }
  }

  async checkConversation(conversationId) {
    const conversation = conversationDao.getConversationById(conversationId)
    if (!conversation) {
      return
    }
    if (conversation.category === 'GROUP') {
      await this.refreshConversation(conversation.conversation_id)
    } else {
      await this.createConversation(conversation)
    }
  }

  async checkConversationExist(conversation) {
    if (conversation.status !== ConversationStatus.SUCCESS) {
      await this.createConversation(conversation)
    }
  }

  async createConversation(conversation) {
    const request = {
      conversation_id: conversation.conversation_id,
      category: conversation.category,
      participants: [{ user_id: conversation.owner_id, role: '' }]
    }
    const response = await conversationApi.createContactConversation(request)
    if (response && !response.error && response.data.data) {
      conversationDao.updateConversationStatusById(conversation.conversation_id, ConversationStatus.SUCCESS)
      const participants = response.data.data.participant_sessions.map(item => {
        return {
          conversation_id: conversation.conversation_id,
          user_id: item.user_id,
          session_id: item.session_id,
          created_at: new Date().toISOString()
        }
      })
      participantSessionDao.replaceAll(conversation.conversation_id, participants)
    }
  }

  async sendSenderKey(conversationId, recipientId, sessionId) {
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
      signalProtocol.processSession(key.user_id, signalProtocol.convertToDeviceId(key.session_id), JSON.stringify(key))
    } else {
      return
    }
    let cipherText = signalProtocol.encryptSenderKey(
      conversationId,
      recipientId,
      signalProtocol.convertToDeviceId(sessionId),
      this.getAccountId(),
      this.getDeviceId()
    )

    if (cipherText) {
      const bm = {
        id: uuidv4(),
        action: 'CREATE_SIGNAL_KEY_MESSAGES',
        params: {
          conversation_id: conversationId,
          messages: [
            {
              message_id: uuidv4().toLowerCase(),
              recipient_id: recipientId,
              data: cipherText,
              session_id: sessionId
            }
          ],
          conversation_checksum: this.getCheckSum(conversationId)
        }
      }
      await Vue.prototype.$blaze.sendMessagePromise(bm).then(
        _ => {},
        async error => {
          if (error.code === 20140) {
            await self.refreshConversation(conversationId)
            await self.sendSenderKey(conversationId, recipientId, sessionId)
          } else if (error.code === 403) {
          } else {
            console.log(error)
          }
        }
      )
    }
  }
}
