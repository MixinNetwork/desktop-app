import { ConversationCategory } from '@/utils/constants.js'
export default {
  currentConversationId: state => {
    return state.currentConversationId
  },

  getConversations: state => {
    return state.conversationKeys
      .map(key => {
        return state.conversations[key]
      })
      .filter(item => {
        return (
          item &&
          item.category &&
          (item.category === ConversationCategory.CONTACT || item.category === ConversationCategory.GROUP) &&
          item.messageStatus
        )
      })
  },

  currentConversation: state => {
    const { conversations, currentConversationId } = state
    if (conversations && currentConversationId) {
      return conversations[currentConversationId]
    } else {
      return null
    }
  },

  currentUser: state => {
    return state.currentUser
  },

  currentAudio: state => {
    return state.currentAudio
  },

  findFriends: state => {
    return state.friends
  },

  me: state => {
    return state.me
  },

  search: state => {
    return state.search
  },

  showTime: state => {
    return state.showTime
  },

  linkStatus: state => {
    return state.linkStatus
  },
  attachment: state => {
    return state.attachment
  }
}
