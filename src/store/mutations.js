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

function search(state, payload) {
  const { keyword, type } = payload
  const LIMIT = 3

  function searchChats(conversations, limit) {
    const countMap = {}
    let num = 0
    for (let i = 0; i < conversations.length; i++) {
      const conversation = conversations[i]
      const count = messageDao.ftsMessageCount(conversation.conversationId, keyword)
      if (count > 0) {
        num++
        countMap[conversation.conversationId] = count
      }
      if (limit > 0 && num > limit) {
        break
      }
    }
    const findChats = []
    Object.keys(countMap).forEach(key => {
      if (countMap[key] > 0) {
        const temp = state.conversations[key]
        temp.records = countMap[key]
        findChats.push(temp)
      }
    })
    return findChats
  }

  if (keyword) {
    keywordCache = keyword
    const account = state.me

    let { chats, chatsAll, contact, contactAll } = state.search

    if (!type || type === 'chats') {
      const conversations = conversationDao.getConversations()
      let limit = 0
      if (!type) {
        setTimeout(() => {
          const findChats = searchChats(conversations, 0)
          chatsAll = [...findChats]
          state.search.chatsAll = chatsAll
        }, 1000)
        limit = 3
      }
      const findChats = searchChats(conversations, limit)
      chatsAll = [...findChats]
      chats = findChats.splice(0, LIMIT)
    }

    if (!type || type === 'contact') {
      const findContact = userDao.fuzzySearchUser(account.user_id, keyword).filter(item => {
        if (!chats) return []
        return !chats.some(conversation => {
          return conversation.category === ConversationCategory.CONTACT && conversation.ownerId === item.user_id
        })
      })
      contactAll = [...findContact]
      contact = findContact.splice(0, LIMIT)
    }

    state.search = {
      contact,
      chats,
      contactAll,
      chatsAll
    }
  } else {
    keywordCache = null
    state.search = {
      contact: null,
      chats: null,
      contactAll: null,
      chatsAll: null
    }
  }
}

export default {
  exit(state) {
    state.me = {}
    state.currentConversationId = null
    state.conversations = {}
    state.conversationKeys = []
    state.friends = []
    state.currentUser = {}
    state.search = {
      contact: null,
      chats: null,
      contactAll: null,
      chatsAll: null
    }
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
    messageBox.setConversationId(conversationId, unseenMessageCount)
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
    state.currentUser = userDao.findUserByConversationId(conversationId)
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
      contactAll: null,
      chatsAll: null
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
  }
}
