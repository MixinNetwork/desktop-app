import api from '@/api/base'
// @ts-ignore
import { v4 as uuidv4 } from 'uuid'
import { ConversationCategory } from '@/utils/constants'

export default {
  createGroupConversation(groupName: string, users: any[]) {
    groupName = groupName.trim()
    const conversationId = uuidv4()
    const participants = users.map(function(item: any, index: any) {
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
  createContactConversation(body: any) {
    return api.post('/conversations', body)
  },
  getConversation(id: string) {
    return api.get('/conversations/' + id)
  },
  updateConversation(id: string, body: any) {
    return api.post('/conversations/' + id, body)
  },
  exit(id: string) {
    return api.post('conversations/' + id + '/exit')
  },
  mute(id: string, payload: any) {
    return api.post('conversations/' + id + '/mute', payload)
  },
  participant(id: string, action: string, userId: any, role: string) {
    const data: any = {
      user_id: userId
    }
    if (role) {
      data.role = role
      if (role === 'USER') {
        data.role = ''
      }
    }
    return api.post('conversations/' + id + '/participants/' + action, [data])
  },
  requestAttachment() {
    return api.post('attachments')
  }
}
