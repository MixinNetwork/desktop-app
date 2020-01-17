import conversationDao from '@/dao/conversation_dao'
import messageDao from '@/dao/message_dao'
import stickerDao from '@/dao/sticker_dao'
import userDao from '@/dao/user_dao'
import participantDao from '@/dao/participant_dao'
import conversationApi from '@/api/conversation'
import userApi from '@/api/user'
import { generateConversationId } from '@/utils/util'
import { ConversationStatus, ConversationCategory, MessageStatus, MediaStatus } from '@/utils/constants'
import uuidv4 from 'uuid/v4'
import jobDao from '@/dao/job_dao'
import { downloadAttachment, downloadQueue, uploadAttachment, putAttachment } from '@/utils/attachment_util'
import appDao from '@/dao/app_dao'

function markRead(conversationId) {
  messageDao.findUnreadMessage(conversationId).forEach(function(item, index) {
    updateRemoteMessageStatus(conversationId, item.message_id, MessageStatus.READ)
  })
  messageDao.markRead(conversationId)
}

async function refreshConversation(conversationId, callback) {
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
    await refreshParticipants(conversation.conversation_id, conversation.participants, callback)
    await syncUser(ownerId)
  }
}
async function refreshParticipants(conversationId, participants, callback) {
  const local = participantDao.getParticipants(conversationId)
  const localIds = local.map(function(item) {
    return item.user_id
  })
  const online = []
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
    fetchUsers(needFetchUsers)
  }
  if (remove.length > 0) {
    participantDao.deleteAll(conversationId, remove)
  }

  if (add.length > 0 || remove.length > 0) {
    callback()
  }
}

async function syncUser(userId) {
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

async function fetchUsers(users) {
  const resp = await userApi.getUsers(users)
  if (resp.data.data) {
    userDao.insertUsers(resp.data.data)
  }
}

function updateRemoteMessageStatus(conversationId, messageId, status) {
  const blazeMessage = { message_id: messageId, status: status }
  jobDao.insert({
    job_id: uuidv4(),
    action: 'ACKNOWLEDGE_MESSAGE_RECEIPTS',
    created_at: new Date().toISOString(),
    order_id: null,
    priority: 5,
    user_id: null,
    blaze_message: JSON.stringify(blazeMessage),
    conversation_id: null,
    resend_message_id: null,
    run_count: 0
  })

  jobDao.insert({
    job_id: uuidv4(),
    action: 'CREATE_MESSAGE',
    created_at: new Date().toISOString(),
    order_id: null,
    priority: 5,
    user_id: null,
    blaze_message: JSON.stringify(blazeMessage),
    conversation_id: conversationId,
    resend_message_id: null,
    run_count: 0
  })
}

export default {
  createUserConversation: ({ commit, state }, payload) => {
    const { user } = payload
    const account = JSON.parse(localStorage.getItem('account'))
    if (user.user_id === account.user_id) {
      return
    }
    let conversation = conversationDao.getConversationByUserId(user.user_id)
    if (conversation && state.conversations && state.conversations[conversation.conversation_id]) {
      commit('setCurrentConversation', conversation)
    } else {
      const senderId = account.user_id
      const conversationId = generateConversationId(senderId, user.user_id)
      const createdAt = new Date().toISOString()
      conversation = {
        conversation_id: conversationId,
        owner_id: user.user_id,
        category: ConversationCategory.CONTACT,
        name: null,
        icon_url: null,
        announcement: '',
        code_url: null,
        pay_type: null,
        created_at: createdAt,
        pin_time: null,
        last_message_id: null,
        last_read_message_id: null,
        unseen_message_count: 0,
        status: ConversationStatus.START,
        draft: null,
        mute_until: null
      }
      conversationDao.insertConversation(conversation)
      participantDao.insertAll([
        {
          conversation_id: conversationId,
          user_id: senderId,
          role: '',
          created_at: new Date().toISOString()
        },
        {
          conversation_id: conversationId,
          user_id: user.user_id,
          role: '',
          created_at: new Date().toISOString()
        }
      ])
      commit('setCurrentConversation', conversation)
    }
  },
  createGroupConversation: async({ commit }, payload) => {
    const response = await conversationApi.createGroupConversation(payload.groupName, payload.users)
    if (response.data.data) {
      const conversation = response.data.data
      conversationDao.insertConversation({
        conversation_id: conversation.conversation_id,
        owner_id: conversation.creator_id,
        category: conversation.category,
        name: conversation.name,
        icon_url: conversation.icon_url,
        announcement: conversation.announcement,
        code_url: conversation.code_url,
        pay_type: null,
        created_at: conversation.created_at,
        pin_time: null,
        last_message_id: null,
        last_read_message_id: null,
        unseen_message_count: 0,
        status: ConversationStatus.SUCCESS,
        draft: null,
        mute_until: conversation.mute_until
      })
      if (conversation.participants) {
        participantDao.insertAll(
          conversation.participants.map(item => {
            return {
              conversation_id: conversation.conversation_id,
              user_id: item.user_id,
              role: item.role,
              created_at: item.created_at
            }
          })
        )
        commit('refreshParticipants', conversation.conversation_id)
      }
      commit('setCurrentConversation', conversation)
    }
  },
  saveAccount: ({ commit }, user) => {
    userDao.insertUser(user)
    commit('saveAccount', user)
  },
  setCurrentConversation: async({ commit }, conversation) => {
    commit('setCurrentConversation', conversation)
  },
  markRead: ({ commit }, conversationId) => {
    markRead(conversationId)
    commit('refreshConversation', conversationId)
  },
  updateConversationMute: ({ commit }, { conversation, ownerId }) => {
    if (conversation.category === ConversationCategory.CONTACT) {
      userDao.updateMute(conversation.mute_until, ownerId)
    } else if (conversation.category === ConversationCategory.GROUP) {
      conversationDao.updateMute(conversation.mute_until, conversation.conversation_id)
    }
    commit('refreshConversations')
  },
  conversationClear: ({ commit }, conversationId) => {
    messageDao.ftsMessagesDelete(conversationId)
    setTimeout(() => {
      conversationDao.deleteConversation(conversationId)
    }, 1000)
    commit('conversationClear', conversationId)
  },
  pinTop: ({ commit }, payload) => {
    conversationDao.updateConversationPinTimeById(
      payload.conversationId,
      payload.pinTime ? null : new Date().toISOString()
    )
    commit('refreshConversations')
  },
  refreshUser: async({ commit }, { userId, conversationId }) => {
    const response = await userApi.getUserById(userId)
    if (response.data.data) {
      let user = userDao.findUserById(userId)
      let u = response.data.data
      if (!user) {
        userDao.insertUser(u)
      } else {
        if (!u.mute_until) {
          u.mute_until = user.mute_until
        }
        userDao.update(u)
      }
      appDao.insert(u.app)
      if (conversationId) {
        commit('refreshConversation', conversationId)
      }
    }
  },
  setCurrentAudio: ({ commit }, audioMessage) => {
    commit('setCurrentAudio', audioMessage)
  },
  setCurrentMessages: ({ commit }, messages) => {
    commit('setCurrentMessages', messages)
  },
  sendMessage: ({ commit }, { msg, quoteId }) => {
    markRead(msg.conversationId)
    if (quoteId) {
      let quoteItem = messageDao.findMessageItemById(msg.conversationId, quoteId)
      if (quoteItem) {
        messageDao.insertRelyMessage(msg, quoteId, JSON.stringify(quoteItem))
        commit('refreshMessage', msg.conversationId)
        return
      }
    }
    messageDao.insertTextMessage(msg)
    commit('refreshMessage', msg.conversationId)
  },
  sendStickerMessage: ({ commit }, msg) => {
    const { conversationId, stickerId, category, status } = msg
    markRead(conversationId)
    const messageId = uuidv4().toLowerCase()
    const content = btoa(`{"sticker_id":"${stickerId}"}`)
    messageDao.insertMessage({
      message_id: messageId,
      conversation_id: conversationId,
      user_id: JSON.parse(localStorage.getItem('account')).user_id,
      category,
      content,
      status,
      created_at: new Date().toISOString(),
      sticker_id: stickerId
    })
    const sticker = stickerDao.getStickerByUnique(stickerId)
    sticker.last_use_at = new Date().toISOString()
    stickerDao.insertUpdate(sticker)
    commit('refreshMessage', msg.conversationId)
  },
  sendLiveMessage: ({ commit }, msg) => {
    const { conversationId, mediaUrl, mediaMimeType,
      mediaSize, mediaWidth, mediaHeight, thumbUrl, name, category } = msg
    const messageId = uuidv4().toLowerCase()
    const payload = {
      width: mediaWidth,
      height: mediaHeight,
      thumb_url: thumbUrl,
      url: mediaUrl
    }
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    messageDao.insertMessage({
      message_id: messageId,
      conversation_id: conversationId,
      user_id: JSON.parse(localStorage.getItem('account')).user_id,
      content: content,
      category: category,
      media_url: mediaUrl,
      media_mime_type: mediaMimeType,
      media_size: mediaSize,
      media_width: mediaWidth,
      media_height: mediaHeight,
      thumb_url: thumbUrl,
      media_status: 'PENDING',
      status: MessageStatus.SENDING,
      created_at: new Date().toISOString(),
      name
    })
    commit('refreshMessage', conversationId)
  },
  sendAttachmentMessage: ({ commit }, { conversationId, mediaUrl, mediaMimeType, category }) => {
    const messageId = uuidv4().toLowerCase()
    putAttachment(
      mediaUrl,
      mediaMimeType,
      category,
      messageId,
      data => {
        messageDao.insertMessage({
          message_id: messageId,
          conversation_id: conversationId,
          user_id: JSON.parse(localStorage.getItem('account')).user_id,
          category: category,
          media_url: data.mediaUrl,
          media_mime_type: data.mediaMimeType,
          media_size: data.mediaSize,
          media_width: data.mediaWidth,
          media_height: data.mediaHeight,
          thumb_image: data.thumbImage,
          media_status: 'PENDING',
          status: MessageStatus.SENDING,
          created_at: new Date().toISOString(),
          name: data.name
        })
        commit('startLoading', messageId)
        commit('refreshMessage', conversationId)
      },
      transferAttachmentData => {
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(transferAttachmentData))))
        messageDao.updateMessageContent(content, messageId)
        messageDao.updateMediaStatus(MediaStatus.DONE, messageId)
        // Todo
        messageDao.updateMessageStatusById(MessageStatus.SENDING, messageId)
        commit('stopLoading', messageId)
      },
      e => {
        console.log(e)
        messageDao.updateMediaStatus(MediaStatus.CANCELED, messageId)
        commit('stopLoading', messageId)
        commit('refreshMessage', conversationId)
      }
    )
  },
  upload: ({ commit }, message) => {
    commit('startLoading', message.messageId)
    uploadAttachment(
      message.mediaUrl.replace('file://', ''),
      message.type,
      (attachmentId, key, digest) => {
        let msg = {
          attachment_id: attachmentId,
          mime_type: message.mediaMimeType,
          size: message.mediaSize,
          width: message.mediaWidth,
          height: message.mediaHeight,
          name: message.mediaName,
          thumbnail: message.thumbImage,
          digest: digest,
          key: key
        }
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(msg))))
        messageDao.updateMessageContent(content, message.messageId)
        messageDao.updateMediaStatus(MediaStatus.DONE, message.messageId)
        // Todo
        messageDao.updateMessageStatusById(MessageStatus.SENDING, message.messageId)
        commit('stopLoading', message.messageId)
      },
      e => {
        console.log(e)
        messageDao.updateMediaStatus(MediaStatus.CANCELED, message.messageId)
        commit('stopLoading', message.messageId)
        commit('refreshMessage', message.conversationId)
      }
    )
  },
  init: ({ commit }) => {
    commit('init')
  },
  refreshFriends: async({ commit }, friends) => {
    userDao.insertUsers(friends)
    let f = friends.map(item => item.user_id)
    let df = userDao
      .findFriends()
      .filter(item => {
        return !f.some(id => {
          return item.user_id === id
        })
      })
      .map(item => {
        return item.user_id
      })
    if (df.length > 0) {
      const resp = await userApi.getUsers(df)
      if (resp.data.data) {
        userDao.insertUsers(resp.data.data)
      }
    }
    commit('refreshFriends', friends)
  },
  insertUser: (_, user) => {
    userDao.insertUser(user)
  },
  makeMessageStatus: ({ commit }, payload) => {
    messageDao.updateMessageStatusById(payload.status, payload.messageId)
    const conversationId = messageDao.getConversationIdById(payload.messageId)
    commit('refreshMessage', conversationId)
  },
  search: ({ commit }, payload) => {
    commit('search', payload)
  },
  searchClear: ({ commit }) => {
    commit('searchClear')
  },
  refreshParticipants: ({ commit }, conversationId) => {
    commit('refreshParticipants', conversationId)
  },
  refreshMessage: ({ commit }, conversationId) => {
    commit('refreshMessage', conversationId)
  },
  exit: ({ commit }) => {
    commit('exit')
  },
  showTime: ({ commit }) => {
    commit('toggleTime', true)
  },
  hideTime: ({ commit }) => {
    commit('toggleTime', false)
  },
  setLinkStatus: ({ commit }, status) => {
    commit('setLinkStatus', status)
  },
  exitGroup: (_, conversationId) => {
    conversationApi.exit(conversationId)
  },
  participantSetAsAdmin: (_, payload) => {
    const { conversationId, userId } = payload
    conversationApi.participant(conversationId, 'ROLE', userId, 'ADMIN')
  },
  participantRemove: (_, payload) => {
    const { conversationId, userId } = payload
    conversationApi.participant(conversationId, 'REMOVE', userId, '')
  },
  startLoading: ({ commit }, messageId) => {
    commit('startLoading', messageId)
  },
  stopLoading: ({ commit }, messageId) => {
    commit('stopLoading', messageId)
  },
  download: ({ commit }, messageId) => {
    commit('startLoading', messageId)
    let message = messageDao.getMessageById(messageId)
    downloadQueue.push(
      async message => {
        try {
          const [m, filePath] = await downloadAttachment(message)
          messageDao.updateMediaMessage('file://' + filePath, MediaStatus.DONE, m.message_id)
          commit('stopLoading', m.message_id)
          commit('refreshMessage', m.conversation_id)
        } catch (e) {
          console.log(e)
          messageDao.updateMediaMessage(null, MediaStatus.CANCELED, message.message_id)
          commit('stopLoading', message.message_id)
          commit('refreshMessage', message.conversation_id)
        }
      },
      { args: message }
    )
    commit('refreshMessage', message.conversation_id)
  },
  syncConversation: async({ commit }, conversationId) => {
    await refreshConversation(conversationId, function() {
      commit('refreshConversation', conversationId)
    })
  },
  recallMessage: ({ commit }, { messageId, conversationId }) => {
    messageDao.recallMessageAndSend(messageId)
    jobDao.insert({
      job_id: uuidv4(),
      action: 'RECALL_MESSAGE',
      created_at: new Date().toISOString(),
      order_id: null,
      priority: 5,
      user_id: null,
      blaze_message: btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify({
              message_id: messageId
            })
          )
        )
      ),
      conversation_id: conversationId,
      resend_message_id: null,
      run_count: 0
    })
    commit('refreshMessage', conversationId)
  },
  toggleEditor: ({ commit }) => {
    commit('toggleEditor')
  }
}
