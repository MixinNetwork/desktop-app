import api from '@/api/base'
// @ts-ignore
import uuidv4 from 'uuid/v4'
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
  exit(id: string) {
    return api.post('conversations/' + id + '/exit')
  },
  mute(id: string, duration: any) {
    return api.post('conversations/' + id + '/mute', { duration })
  },
  participant(id: string, action: string, userId: any, role: string) {
    const data: any = {
      user_id: userId
    }
    if (role) {
      data.role = role
    }
    return api.post('conversations/' + id + '/participants/' + action, [data])
  },
  requestAttachment() {
    return api.post('attachments')
  }
}
