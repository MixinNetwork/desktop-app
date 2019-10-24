import db from '@/persistence/db'

class SessionParticipantsDao {
  insert(sessionParticipant) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO session_participants VALUES (@conversation_id, @user_id, @session_id, @sent_to_server, @created_at)'
    )
    stmt.run(sessionParticipant)
  }

  insertAll(sessionParticipants) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO session_participants VALUES (@conversation_id, @user_id, @session_id, @sent_to_server, @created_at)'
    )
    for (const sessionParticipant of sessionParticipants) {
      stmt.run(sessionParticipant)
    }
  }

  getNotSendSessionParticipants(conversationId, sessionId) {
    const stmt = db.prepare(
      'SELECT p.* FROM session_participants p WHERE p.conversation_id = ? AND p.session_id != ? AND p.sent_to_server is NULL'
    )
    return stmt.all(conversationId, sessionId)
  }

  updateList(sessionParticipants) {
    const stmt = db.prepare(
      'UPDATE session_participants SET sent_to_server = @sent_to_server, created_at = @created_at WHERE conversation_id = @conversation_id AND user_id = @user_id'
    )
    for (const participant of sessionParticipants) {
      stmt.run(participant)
    }
  }
}

export default new SessionParticipantsDao()
