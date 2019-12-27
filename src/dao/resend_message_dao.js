import db from '@/persistence/db'

class ResendMessagesDao {
  insertMessage(messageId, userId, sessionId, status) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO resend_session_messages VALUES (@message_id, @user_id, @session_id, @status, @created_at)'
    )
    stmt.run({
      message_id: messageId,
      user_id: userId,
      session_id: sessionId,
      status: status,
      created_at: new Date().toISOString()
    })
  }

  findResendMessage(userId, messageId) {
    db.prepare('SELECT * FROM resend_session_messages WHERE user_id = ? AND message_id = ?').get([userId, messageId])
  }

  deleteResendMessageByMessageId(messageId) {
    db.prepare('DELETE FROM resend_session_messages WHERE message_id = ?').run([messageId])
  }
}

export default new ResendMessagesDao()
