import api from '@/api/base'
import uuidv4 from 'uuid/v4'
import { ConversationCategory } from '@/utils/constants'

export default {
  createGroupConversation(groupName, users) {
    groupName = groupName.trim()
    const conversationId = uuidv4()
    const participants = users.map(function(item, index) {
      return {
        conversation_id: conversationId,
        user_id: item.user_id,
        role: ''
      }
    })
    return api.post('/conversations', {
      conversation_id: conversationId,
      category: ConversationCategory.GROUP,
      name: groupName,
      participants: participants
    })
  },
  createContactConversation(body) {
    return api.post('/conversations', body)
  },
  getConversation(id) {
    return api.get('/conversations/' + id)
  },
  exit(id) {
    return api.post('conversations/' + id + '/exit')
  },
  mute(id, duration) {
    return api.post('conversations/' + id + '/mute', { duration })
  },
  requestAttachment() {
    return api.post('attachments')
  }
}
