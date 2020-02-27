import db from '@/persistence/db'

class MessageMentionDao {
  getMentionData(messageId: any) {
    return db.prepare('SELECT mentions FROM message_mentions WHERE message_id = ?').get(messageId)
  }
}

export default new MessageMentionDao()
