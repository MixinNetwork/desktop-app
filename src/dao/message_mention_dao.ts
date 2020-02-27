import db from '@/persistence/db'

class MessageMentionDao {
  insert(conversationId: any, messageId: any, mentions: any, hasRead: any) {
    db.prepare('INSERT OR REPLACE INTO message_mentions(message_id,conversation_id,mentions,has_read) VALUES (?,?,?,?)').run([messageId, conversationId, mentions, hasRead])
  }
  getMentionData(messageId: any) {
    return db.prepare('SELECT mentions FROM message_mentions WHERE message_id = ?').get(messageId)
  }

  markMentionRead(messageId: any) {
    db.prepare('UPDATE message_mentions SET has_read = 1 WHERE message_id = ?').run(messageId)
  }
}

export default new MessageMentionDao()
