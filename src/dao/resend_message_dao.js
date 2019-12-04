import db from '@/persistence/db'

class ResendMessagesDao {
  insertMessage(messageId, userId, sessionId, status) {
    db.prepare(
      'INSERT OR REPLACE INTO resend_messages VALUES (@message_id, @user_id, @sessionId, @status, @created_at)'
    )
    db.run({
      message_id: messageId,
      user_id: userId,
      session_id: sessionId,
      status: status,
      created_at: new Date().toISOString()
    })
  }

  findResendMessage(userId, messageId) {
    db.prepare('SELECT * FROM resend_messages WHERE user_id = ? AND message_id = ?').get([userId, messageId])
  }
}

export default new ResendMessagesDao()
