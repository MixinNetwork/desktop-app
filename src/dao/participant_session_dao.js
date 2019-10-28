import db from '@/persistence/db'

class ParticipantSessionDao {
  insert(sessionParticipant) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO participant_session VALUES (@conversation_id, @user_id, @session_id, @sent_to_server, @created_at)'
    )
    stmt.run(sessionParticipant)
  }

  insertAll(sessionParticipants) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO participant_session VALUES (@conversation_id, @user_id, @session_id, @sent_to_server, @created_at)'
    )
    for (const sessionParticipant of sessionParticipants) {
      stmt.run(sessionParticipant)
    }
  }

  getNotSendSessionParticipants(conversationId, sessionId) {
    const stmt = db.prepare(
      'SELECT p.* FROM participant_session p WHERE p.conversation_id = ? AND p.session_id != ? AND p.sent_to_server is NULL'
    )
    return stmt.all(conversationId, sessionId)
  }

  updateList(sessionParticipants) {
    const stmt = db.prepare(
      'UPDATE participant_session SET sent_to_server = @sent_to_server, created_at = @created_at WHERE conversation_id = @conversation_id AND user_id = @user_id'
    )
    for (const participant of sessionParticipants) {
      stmt.run(participant)
    }
  }

  replaceAll(conversationId, participantSessions) {
    const deleteStmt = db.prepare('DELETE FROM participant_session WHERE conversation_id = ?')
    const insertStmt = db.prepare(
      'INSERT OR REPLACE INTO participant_session(conversation_id, user_id, session_id, created_at) VALUES (@conversation_id, @user_id, @session_id, @created_at)'
    )
    const insertMany = db.transaction((conversationId, participantSessions) => {
      deleteStmt.run(conversationId)
      for (const participantSession of participantSessions) {
        insertStmt.run(participantSession)
      }
    })
    insertMany(conversationId, participantSessions)
  }
}

export default new ParticipantSessionDao()
