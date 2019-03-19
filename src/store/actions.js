import conversationDao from '@/dao/conversation_dao'
import messageDao from '@/dao/message_dao'
import userDao from '@/dao/user_dao'
import participantDao from '@/dao/participant_dao.js'
import conversationApi from '@/api/conversation'
import { generateConversationId } from '@/utils/util.js'
import { ConversationStatus, ConversationCategory, MessageStatus } from '@/utils/constants.js'
import uuidv4 from 'uuid/v4'
import jobDao from '@/dao/job_dao'
import { putAttachment } from '@/utils/attachment_util.js'

function markRead(conversationId) {
  messageDao.findUnreadMessage(conversationId).forEach(function(item, index) {
    updateRemoteMessageStatus(item.message_id, MessageStatus.READ)
  })
  messageDao.markRead(conversationId)
}

function updateRemoteMessageStatus(messageId, status) {
  const blazeMessage = { message_id: messageId, status: status }
  jobDao.insert({
    job_id: uuidv4(),
    action: 'CREATE_SESSION_MESSAGE',
    created_at: new Date().toISOString(),
    order_id: null,
    priority: 5,
    user_id: null,
    blaze_message: JSON.stringify(blazeMessage),
    conversation_id: null,
    resend_message_id: null,
    run_count: 0
  })
}

export default {
  createUserConversation: ({ commit, state }, payload) => {
    const { user } = payload
    const account = JSON.parse(localStorage.getItem('account'))
    var conversation = conversationDao.getConversationByUserId(user.user_id)
    if (conversation && state.conversations && state.conversations[conversation.conversation_id]) {
      commit('setCurrentConversation', conversation.conversation_id)
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
      commit('setCurrentConversation', conversation.conversation_id)
    }
  },
  createGroupConversation: async ({ commit }, payload) => {
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
      commit('setCurrentConversation', conversation.conversation_id)
    }
  },
  saveAccount: ({ commit }, user) => {
    userDao.insertUser(user)
    commit('saveAccount', user)
  },
  setCurrentConversation: async ({ commit }, conversationId) => {
    commit('setCurrentConversation', conversationId)
  },
  markRead: ({ commit }, conversationId) => {
    markRead(conversationId)
    commit('refreshConversations')
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
    conversationDao.deleteConversation(conversationId)
    commit('conversationClear', conversationId)
  },
  pinTop: ({ commit }, payload) => {
    conversationDao.updateConversationPinTimeById(
      payload.conversationId,
      payload.pinTime ? null : new Date().toISOString()
    )
    commit('refreshConversations')
  },
  sendMessage: ({ commit }, payload) => {
    markRead(payload.conversationId)
    messageDao.insertTextMessage(payload)
    commit('refreshMessage', payload.conversationId)
  },
  sendAttachmentMessage: ({ commit }, { conversationId, mediaUrl, mediaMimeType, category }) => {
    const messageId = uuidv4().toLowerCase()
    putAttachment(
      mediaUrl,
      mediaMimeType,
      category,
      data => {
        messageDao.insertMessage({
          message_id: messageId,
          conversation_id: conversationId,
          user_id: JSON.parse(localStorage.getItem('account')).user_id,
          category: category,
          content: null,
          media_url: data.mediaUrl,
          media_mime_type: mediaMimeType,
          media_size: data.mediaSize,
          media_duration: null,
          media_width: data.mediaWidth,
          media_height: data.mediaHeight,
          media_hash: null,
          thumb_image: null,
          media_key: null,
          media_digest: null,
          media_status: 'PENDING',
          status: MessageStatus.PENDING,
          created_at: new Date().toISOString(),
          action: null,
          participant_id: null,
          snapshot_id: null,
          hyperlink: null,
          name: null,
          album_id: null,
          sticker_id: null,
          shared_user_id: null,
          media_waveform: null,
          quote_message_id: null,
          quote_content: null
        })
        commit('refreshMessage', conversationId)
      },
      transferAttachmentData => {
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(transferAttachmentData))))
        messageDao.updateMessageContent(content, messageId)
        messageDao.updateMessageStatusById(MessageStatus.SENDING, messageId)
      }
    )
  },
  init: ({ commit }) => {
    commit('init')
  },
  refreshFriends: ({ commit }, payload) => {
    userDao.insertUsers(payload)
    commit('refreshFriends', payload)
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
    commit('search', payload.text)
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
  }
}
