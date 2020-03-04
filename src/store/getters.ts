import { ConversationCategory } from '@/utils/constants'
export default {
  currentConversationId: (state: { currentConversationId: any }) => {
    return state.currentConversationId
  },

  getConversations: (state: { conversationKeys: any[]; conversations: { [x: string]: any } }) => {
    return state.conversationKeys
      .map((key: string | number) => {
        return state.conversations[key]
      })
      .filter((item: { category: string; messageStatus: any }) => {
        return (
          item &&
          item.category &&
          (item.category === ConversationCategory.CONTACT || item.category === ConversationCategory.GROUP) &&
          item.messageStatus
        )
      })
  },

  currentConversation: (state: { conversations: any; currentConversationId: any }) => {
    const { conversations, currentConversationId } = state
    if (conversations && currentConversationId) {
      return conversations[currentConversationId]
    } else {
      return null
    }
  },

  currentUser: (state: { currentUser: any }) => {
    return state.currentUser
  },

  searching: (state: { searching: string }) => {
    return state.searching
  },

  currentAudio: (state: { currentAudio: any }) => {
    return state.currentAudio
  },

  currentMessages: (state: { currentMessages: any }) => {
    return state.currentMessages
  },

  conversationUnseenMentionsMap: (state: { conversationUnseenMentionsMap: any }) => {
    return state.conversationUnseenMentionsMap
  },

  findFriends: (state: { friends: any }) => {
    return state.friends
  },

  me: (state: { me: any }) => {
    return state.me
  },

  search: (state: string) => {
    return state.search
  },

  showTime: (state: { showTime: any }) => {
    return state.showTime
  },

  linkStatus: (state: { linkStatus: any }) => {
    return state.linkStatus
  },
  attachment: (state: { attachment: any }) => {
    return state.attachment
  },
  editing: (state: { editing: boolean }) => {
    return state.editing
  }
}
