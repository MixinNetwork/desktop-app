import Vue from 'vue'
import messageBox from '@/store/message_box'
import conversationDao from '@/dao/conversation_dao'
import participantDao from '@/dao/participant_dao'
import userDao from '@/dao/user_dao'
import messageDao from '@/dao/message_dao'
import { LinkStatus, ConversationCategory } from '@/utils/constants'

function refreshConversations(state: any) {
  const conversations = conversationDao.getConversations()
  const conversationKeys: any = []
  Vue.set(state, 'conversations', {})
  conversations.forEach((conversation: any, index: number) => {
    const conversationId = conversation.conversationId
    conversationKeys[index] = conversationId
    const participants = participantDao.getParticipantsByConversationId(conversationId)
    conversation.participants = participants
    Vue.set(state.conversations, conversationId, conversation)
  })
  state.conversationKeys = conversationKeys
}

function refreshConversation(state: { conversations: object; conversationKeys: any }, conversationId: string) {
  const conversation = conversationDao.getConversationItemByConversationId(conversationId)
  if (conversation) {
    const participants = participantDao.getParticipantsByConversationId(conversationId)
    conversation.participants = participants
    Vue.set(state.conversations, conversationId, conversation)
  }
  state.conversationKeys = conversationDao.getConversationsIds().map((item: { conversationId: any }) => {
    return item.conversationId
  })
}

let keywordCache: any = null

let messageSearchTimer: any = null
function messageSearch(state: any, type: string, keyword: any) {
  let message: any = []
  let messageAll: any = []
  let num = 0

  function action(conversations: any, limit: any, i: number) {
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
      if (i === conversations.length - 1 && num === 0) {
        state.search.message = []
        state.search.messageAll = []
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

function search(state: any, payload: any) {
  const { keyword, type } = payload

  clearTimeout(messageSearchTimer)

  if (keyword) {
    keywordCache = keyword

    let { chats, chatsAll, message, messageAll, contact, contactAll } = state.search

    if (!type || type === 'contacts') {
      const findContact = userDao.fuzzySearchUser(keyword).filter((item: any) => {
        if (!chats) return []
        return !chats.some((conversation: any) => {
          return conversation.category === ConversationCategory.CONTACT && conversation.ownerId === item.user_id
        })
      })
      contactAll = [...findContact]
      contact = findContact.splice(0, 3)
    }

    if (!type || type === 'chats') {
      const findChats = conversationDao.fuzzySearchConversation(keyword)
      findChats.forEach((item: any, index: number) => {
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
  exit(state: any) {
    state.me = {}
    state.currentConversationId = null
    state.editing = false
    state.conversations = {}
    state.conversationKeys = []
    state.friends = []
    state.currentUser = {}
    state.searching = ''
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
  init(state: any) {
    const conversations = conversationDao.getConversations()
    const conversationKeys: any = []
    conversations.forEach((conversation: any, index: number) => {
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
    // @ts-ignore
    state.me = JSON.parse(localStorage.getItem('account'))
    state.conversationKeys = conversationKeys
  },
  saveAccount(state: any, user: any) {
    state.me = user
  },
  setSearching(state: { searching: any }, keyword: any) {
    state.searching = keyword
  },
  setCurrentUser(state: { currentUser: any }, user: any) {
    state.currentUser = user
  },
  setCurrentConversation(state: any, conversation: any) {
    const { unseenMessageCount } = conversation
    let conversationId = conversation.conversationId || conversation.conversation_id
    messageBox.setConversationId(conversationId, unseenMessageCount - 1)
    if (
      !state.conversationKeys.some((item: any) => {
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
  setCurrentAudio(state: { currentAudio: any }, audioMessage: any) {
    state.currentAudio = audioMessage
  },
  setCurrentMessages(state: { currentMessages: any }, messages: any) {
    state.currentMessages = messages
  },
  refreshMessage(state: any, conversationId: string) {
    messageBox.refreshMessage(conversationId)
    if (
      !state.conversationKeys.some((item: any) => {
        return item === conversationId
      })
    ) {
      refreshConversations(state)
    } else {
      refreshConversation(state, conversationId)
    }
  },
  refreshConversation(state: { conversations: object; conversationKeys: any }, conversationId: string) {
    refreshConversation(state, conversationId)
  },
  refreshConversations(state: any) {
    refreshConversations(state)
  },
  conversationClear(state: { conversationKeys: any[]; conversations: { [x: string]: any }; currentConversationId: null; editing: boolean }, conversationId: string) {
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
  refreshFriends(state: { friends: any }) {
    state.friends = userDao.findFriends()
  },
  refreshParticipants(state: { conversations: { [x: string]: { participants: any } } }, conversationId: string) {
    const users = participantDao.getParticipantsByConversationId(conversationId)
    if (state.conversations[conversationId]) {
      state.conversations[conversationId].participants = users
    }
  },
  search(state: any, keyword: any) {
    search(state, keyword)
  },
  searchClear(state: { search: { contact: null; chats: null; message: null; contactAll: null; chatsAll: null; messageAll: null } }) {
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
  toggleTime(state: { showTime: any }, toggle: any) {
    if (state.showTime !== toggle) {
      state.showTime = toggle
    }
  },
  setLinkStatus(state: { linkStatus: any }, status: any) {
    state.linkStatus = status
  },
  startLoading(state: { attachment: any[] }, messageId: any) {
    state.attachment.push(messageId)
  },
  stopLoading(state: { attachment: any }, messageId: any) {
    const arr = state.attachment
    state.attachment = arr.filter((item: any) => {
      return item !== messageId
    })
  },
  toggleEditor(state: { editing: boolean }) {
    state.editing = !state.editing
  }
}
