import messageBox from '@/store/message_box'
import conversationDao from '@/dao/conversation_dao'
import participantDao from '@/dao/participant_dao'
import userDao from '@/dao/user_dao'
import messageDao from '@/dao/message_dao'
import messageMentionDao from '@/dao/message_mention_dao'
import { updateCancelMap } from '@/utils/attachment_util'
import { LinkStatus, ConversationCategory, isMuteCheck } from '@/utils/constants'
// @ts-ignore
import _ from 'lodash'
import { getAccount } from '@/utils/util'

import { ipcRenderer } from 'electron'

let refreshConversationsTimer: any = null

function refreshConversations(state: any) {
  if (refreshConversationsTimer) {
    clearTimeout(refreshConversationsTimer)
    refreshConversationsTimer = null
    refreshConversations(state)
    return
  }
  refreshConversationsTimer = setTimeout(() => {
    const findConversations = conversationDao.getConversations()
    const conversationKeys: any = []
    if (!findConversations.length) {
      state.conversations = {}
      return
    }
    const conversations: any = {}
    findConversations.forEach((conversation: any) => {
      const conversationId = conversation.conversationId
      conversationKeys.push(conversationId)
      const participants = participantDao.getParticipantsByConversationId(conversationId)
      conversation.participants = participants
      conversations[conversationId] = conversation
    })
    state.conversations = conversations
    state.conversationKeys = conversationKeys
    refreshConversationsTimer = null
  }, 100)
}

let updateBadgeCountTimer: any = null
function setUnseenBadgeNum(conversations: any) {
  clearTimeout(updateBadgeCountTimer)
  updateBadgeCountTimer = setTimeout(() => {
    let unseenMessageCount: any = 0
    Object.keys(conversations).forEach(id => {
      const item = conversations[id]
      if (!isMuteCheck(item) && item.unseenMessageCount) {
        unseenMessageCount += item.unseenMessageCount
      }
    })
    ipcRenderer.send('updateBadgeCount', unseenMessageCount)
  }, 300)
}

function refreshConversation(state: any, conversationId: string) {
  const mentionsMap = state.conversationUnseenMentionsMap
  const conversation = conversationDao.getConversationItemByConversationId(conversationId)
  const conversations = state.conversations
  if (conversation) {
    const participants = participantDao.getParticipantsByConversationId(conversationId)
    conversation.participants = participants
    const mentionMessages = messageMentionDao.getUnreadMentionMessagesByConversationId(conversationId)
    if (mentionMessages.length) {
      mentionsMap[conversationId] = mentionMessages
      state.conversationUnseenMentionsMap = _.cloneDeepWith(mentionsMap)
    }
    conversations[conversationId] = conversation
    setUnseenBadgeNum(state.conversations)
  }

  state.conversationKeys = conversationDao.getConversationsIds().map((item: { conversationId: any }) => {
    return item.conversationId
  })
}

let keywordCache: any = null

let messageSearchTimer: any = null
let messageLastSearchTime: any = 0
let messageSearchCountTemp: any = {}
function messageSearch(state: any, type: string, keyword: any) {
  const message: any = []
  const messageAll: any = []
  let num: number = 0
  let isEmpty: boolean = true

  const nowTime = new Date().getTime()
  if (nowTime - messageLastSearchTime > 60000) {
    messageSearchCountTemp = {}
  }
  messageLastSearchTime = nowTime

  function action(conversations: any, limit: any, i: number) {
    if (i < conversations.length) {
      const conversation = conversations[i]
      const { conversationId } = conversation
      const tempkey = conversationId + keyword
      let count = messageSearchCountTemp[tempkey]
      if (!count && count !== 0) {
        count = messageDao.ftsMessageCount(conversationId, keyword)
        messageSearchCountTemp[tempkey] = count
      }
      if (count > 0) {
        isEmpty = false
        num++
        const temp = _.cloneDeepWith(state.conversations[conversationId])
        temp.records = count
        messageAll.push(temp)
        if (num <= limit) {
          message.push(temp)
        }
      }
      const stopFlag = limit > 0 && num > limit
      if ((messageAll.length > 0 && messageAll.length % 6 === 0) || stopFlag) {
        requestAnimationFrame(() => {
          state.search.messageAll = messageAll
          state.search.message = message
        })
      }
      if (stopFlag) {
        return
      }
      messageSearchTimer = setTimeout(() => {
        action(conversations, limit, ++i)
      })
    } else {
      requestAnimationFrame(() => {
        state.search.messageAll = messageAll
        state.search.message = message
      })
    }
  }

  if (!type || type === 'messages') {
    const conversations = conversationDao.getConversations()
    let limit = 0
    if (!type) {
      limit = 3
    }
    action(conversations, limit, 0)
    setTimeout(() => {
      if (isEmpty) {
        state.search.message = []
        state.search.messageAll = []
      }
    }, 200)
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
    state.currentMessages = []
    state.conversationUnseenMentionsMap = {}
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
    const findConversations = conversationDao.getConversations()
    const conversations: any = {}
    const conversationKeys: any = []
    const mentionsMap = state.conversationUnseenMentionsMap
    findConversations.forEach((conversation: any) => {
      const conversationId = conversation.conversationId
      conversationKeys.push(conversationId)
      const participants = participantDao.getParticipantsByConversationId(conversationId)
      conversation.participants = participants
      const mentionMessages = messageMentionDao.getUnreadMentionMessagesByConversationId(conversationId)
      mentionsMap[conversationId] = mentionMessages
      conversations[conversationId] = conversation
    })
    state.conversationKeys = conversationKeys
    state.conversations = conversations
    state.conversationUnseenMentionsMap = _.cloneDeepWith(mentionsMap)
    const friends = userDao.findFriends()
    if (friends.length > 0) {
      state.friends = friends
    }
    state.me = getAccount()
  },
  setUnseenBadgeNum(state: any) {
    setUnseenBadgeNum(state.conversations)
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
    messageBox.setConversationId(conversationId, unseenMessageCount - 1, true)
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
  markMentionRead(state: any, { conversationId, messageId }: any) {
    const mentionsMap = state.conversationUnseenMentionsMap
    if (!conversationId) {
      Object.keys(mentionsMap).forEach(cid => {
        for (let i = 0; i < mentionsMap[cid].length; i++) {
          if (mentionsMap[cid][i].message_id === messageId) {
            conversationId = cid
            break
          }
        }
      })
    }
    const messages = mentionsMap[conversationId] || []
    for (let i = 0; i < messages.length; i++) {
      const mId = messages[i].message_id
      if (mId === messageId) {
        messages.splice(i, 1)
        break
      }
    }
    mentionsMap[conversationId] = messages
    state.conversationUnseenMentionsMap = _.cloneDeepWith(mentionsMap)
  },
  refreshMessage(state: any, payload: any) {
    messageBox.refreshMessage(payload)
    const { conversationId } = payload
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
  refreshConversation(state: any, conversationId: string) {
    refreshConversation(state, conversationId)
  },
  refreshConversations(state: any) {
    refreshConversations(state)
  },
  setCurrentCircle(state: any, circle: any) {
    state.currentCircle = _.cloneDeepWith(circle)
  },
  conversationClear(state: any, conversationId: string) {
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
  searchClear(state: any) {
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
    setTimeout(() => {
      updateCancelMap(messageId)
      const arr = state.attachment
      state.attachment = arr.filter((item: any) => {
        return item !== messageId
      })
    }, 1000)
  },
  toggleEditor(state: { editing: boolean }) {
    requestAnimationFrame(() => {
      state.editing = !state.editing
    })
  }
}
