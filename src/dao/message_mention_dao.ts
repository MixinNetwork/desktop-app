import db from '@/persistence/db'

class MessageMentionDao {
  insert(conversationId: any, messageId: any, mentions: any, hasRead: any) {
    db.prepare('INSERT OR REPLACE INTO message_mentions(conversation_id,message_id,mentions,has_read) VALUES (?,?,?,?)').run([conversationId, messageId, mentions, hasRead])
  }
  getMentionData(messageId: any) {
    return db.prepare('SELECT mentions FROM message_mentions WHERE message_id = ?').get(messageId)
  }

  markMentionRead(messageId: any) {
    db.prepare('UPDATE message_mentions SET has_read = 1 WHERE message_id = ?').run(messageId)
  }

  getUnreadMentionMessagesByConversationId(conversationId: string) {
    return db.prepare('SELECT * FROM message_mentions WHERE conversation_id = ? AND has_read = 0').all(conversationId)
  }
}

export default new MessageMentionDao()
