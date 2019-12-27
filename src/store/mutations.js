import Vue from 'vue'
import messageBox from '@/store/message_box.js'
import conversationDao from '@/dao/conversation_dao'
import participantDao from '@/dao/participant_dao'
import userDao from '@/dao/user_dao'
import messageDao from '@/dao/message_dao'
import { LinkStatus, ConversationCategory } from '@/utils/constants.js'

function refreshConversations(state) {
  const conversations = conversationDao.getConversations()
  const conversationKeys = []
  Vue.set(state, 'conversations', {})
  conversations.forEach((conversation, index) => {
    const conversationId = conversation.conversationId
    conversationKeys[index] = conversationId
    const participants = participantDao.getParticipantsByConversationId(conversationId)
    conversation.participants = participants
    Vue.set(state.conversations, conversationId, conversation)
  })
  state.conversationKeys = conversationKeys
}

function refreshConversation(state, conversationId) {
  const conversation = conversationDao.getConversationItemByConversationId(conversationId)
  if (conversation) {
    const participants = participantDao.getParticipantsByConversationId(conversationId)
    conversation.participants = participants
    Vue.set(state.conversations, conversationId, conversation)
  }
  state.conversationKeys = conversationDao.getConversationsIds().map(item => {
    return item.conversationId
  })
}

let keywordCache = null

let messageSearchTimer = null
function messageSearch(state, type, keyword) {
  let message = []
  let messageAll = []
  let num = 0

  function action(conversations, limit, i) {
    if (i < conversations.length) {
      const conversation = conversations[i]
      const count = messageDao.ftsMessageCount(conversation.conversationId, keyword)
      let waitTime = 0
      if (count > 0) {
        num++
        const temp = JSON.parse(JSON.stringify(state.conversations[conversation.conversationId]))
        temp.records = count

        messageAll.push(temp)
        state.search.messageAll = messageAll
        if (num <= limit) {
          message.push(temp)
          state.search.message = message
        }
        if (limit > 0 && num > limit) {
          return
        }
        if (num < 10) {
          waitTime = 0
        } else if (num < 50) {
          waitTime = 50
        } else {
          waitTime = 100
        }
      }
      messageSearchTimer = setTimeout(() => {
        action(conversations, limit, ++i)
      }, waitTime)
    }
  }

  if (!type || type === 'messages') {
    const conversations = conversationDao.getConversations()
    let limit = 0
    if (!type) {
      limit = 3
    }
    action(conversations, limit, 0)
  }
}

function search(state, payload) {
  const { keyword, type } = payload

  clearTimeout(messageSearchTimer)

  if (keyword) {
    keywordCache = keyword
    const account = state.me

    let { chats, chatsAll, message, messageAll, contact, contactAll } = state.search

    if (!type || type === 'contacts') {
      const findContact = userDao.fuzzySearchUser(account.user_id, keyword).filter(item => {
        if (!chats) return []
        return !chats.some(conversation => {
          return conversation.category === ConversationCategory.CONTACT && conversation.ownerId === item.user_id
        })
      })
      contactAll = [...findContact]
      contact = findContact.splice(0, 3)
    }

    if (!type || type === 'chats') {
      const findChats = conversationDao.fuzzySearchConversation(keyword)
      findChats.forEach((item, index) => {
        const participants = participantDao.getParticipantsByConversationId(item.conversationId)
        findChats[index].participants = participants
      })
      chatsAll = [...findChats]
      chats = findChats.splice(0, 3)
    }

    messageSearch(state, type, keyword)

    state.search = {
      contact,
      chats,
      message,
      contactAll,
      chatsAll,
      messageAll
    }
  } else {
    keywordCache = null
    state.search = {
      contact: null,
      chats: null,
      message: null,
      contactAll: null,
      chatsAll: null,
      messageAll: null
    }
  }
}

export default {
  exit(state) {
    state.me = {}
    state.currentConversationId = null
    state.editing = false
    state.conversations = {}
    state.conversationKeys = []
    state.friends = []
    state.currentUser = {}
    state.currentMessages = {}
    state.search = {
      contact: null,
      chats: null,
      message: null,
      contactAll: null,
      chatsAll: null,
      messageAll: null
    }
    state.currentAudio = null
    state.showTime = false
    state.linkStatus = LinkStatus.CONNECTED
  },
  init(state) {
    const conversations = conversationDao.getConversations()
    const conversationKeys = []
    conversations.forEach((conversation, index) => {
      const conversationId = conversation.conversationId
      conversationKeys[index] = conversationId
      const participants = participantDao.getParticipantsByConversationId(conversationId)
      conversation.participants = participants
      Vue.set(state.conversations, conversationId, conversation)
    })
    const friends = userDao.findFriends()
    if (friends.length > 0) {
      state.friends = friends
    }
    state.me = JSON.parse(localStorage.getItem('account'))
    state.conversationKeys = conversationKeys
  },
  saveAccount(state, user) {
    state.me = user
  },
  setCurrentConversation(state, conversation) {
    const { unseenMessageCount } = conversation
    let conversationId = conversation.conversationId || conversation.conversation_id
    messageBox.setConversationId(conversationId, unseenMessageCount - 1)
    if (
      !state.conversationKeys.some(item => {
        return item === conversationId
      })
    ) {
      refreshConversations(state)
    } else {
      refreshConversation(state, conversationId)
    }
    state.currentConversationId = conversationId
    state.editing = false
    state.currentUser = userDao.findUserByConversationId(conversationId)
  },
  setCurrentAudio(state, audioMessage) {
    state.currentAudio = audioMessage
  },
  setCurrentMessages(state, messages) {
    state.currentMessages = messages
  },
  refreshMessage(state, conversationId) {
    messageBox.refreshMessage(conversationId)
    if (
      !state.conversationKeys.some(item => {
        return item === conversationId
      })
    ) {
      refreshConversations(state)
    } else {
      refreshConversation(state, conversationId)
    }
  },
  refreshConversation(state, conversationId) {
    refreshConversation(state, conversationId)
  },
  refreshConversations(state) {
    refreshConversations(state)
  },
  conversationClear(state, conversationId) {
    const index = state.conversationKeys.indexOf(conversationId)
    if (index > -1) {
      state.conversationKeys.splice(index, 1)
    }
    delete state.conversations[conversationId]
    messageBox.clearData(conversationId)
    if (keywordCache) {
      search(state, keywordCache)
    }
    if (state.currentConversationId === conversationId) {
      state.currentConversationId = null
      state.editing = false
    }
  },
  refreshFriends(state) {
    state.friends = userDao.findFriends()
  },
  refreshParticipants(state, conversationId) {
    const users = participantDao.getParticipantsByConversationId(conversationId)
    if (state.conversations[conversationId]) {
      state.conversations[conversationId].participants = users
    }
  },
  search(state, keyword) {
    search(state, keyword)
  },
  searchClear(state) {
    keywordCache = null
    state.search = {
      contact: null,
      chats: null,
      message: null,
      contactAll: null,
      chatsAll: null,
      messageAll: null
    }
  },
  toggleTime(state, toggle) {
    if (state.showTime !== toggle) {
      state.showTime = toggle
    }
  },
  setLinkStatus(state, status) {
    state.linkStatus = status
  },
  startLoading(state, messageId) {
    state.attachment.push(messageId)
  },
  stopLoading(state, messageId) {
    let arr = state.attachment
    state.attachment = arr.filter(item => {
      return item !== messageId
    })
  },
  toggleEditor(state) {
    state.editing = !state.editing
  }
}
