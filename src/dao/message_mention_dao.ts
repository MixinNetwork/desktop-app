import db from '@/persistence/db'

class MessageMentionDao {
  getMentionData(messageId: any) {
    return db.prepare('SELECT mentions FROM message_mentions WHERE message_id = ?').get(messageId)
  }

  markMentionRead(messageId: any) {
    db.prepare('UPDATE message_mentions SET has_read = 1 WHERE message_id = ?').run(messageId)
  }
}

export default new MessageMentionDao()
