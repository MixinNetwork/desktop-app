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

  getParticipantSessionsByConversationId(conversationId) {
    return db
      .prepare(
        'SELECT * FROM participant_session WHERE conversation_id = ?'
      )
      .all(conversationId)
  }

  getNotSendSessionParticipants(conversationId, sessionId) {
    return db
      .prepare(
        'SELECT p.* FROM participant_session p LEFT JOIN users u ON p.user_id = u.user_id WHERE p.conversation_id = ? AND p.session_id != ? AND u.app_id IS NULL AND p.sent_to_server IS NULL'
      )
      .all(conversationId, sessionId)
  }

  getParticipantsSession(conversationId) {
    return db
      .prepare(
        'SELECT * FROM participant_session WHERE conversation_id = ?'
      )
      .all(conversationId)
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

  deleteList(del) {
    const deleteStmt = db.prepare('DELETE FROM participant_session WHERE conversation_id = ? AND user_id = ? AND session_id = ?')
    const deleteMany = db.transaction((del) => {
      for (const item of del) {
        deleteStmt.run(item.conversation_id, item.user_id, item.session_id)
      }
    })
    deleteMany(del)
  }

  delete(conversationId, participantId) {
    const stmt = db.prepare('DELETE FROM participant_session WHERE conversation_id = ? AND user_id = ?')
    stmt.run(conversationId, participantId)
  }

  updateStatusByConversationId(conversationId) {
    const stmt = db.prepare(
      'UPDATE participant_session SET sent_to_server = NULL WHERE conversation_id = ?'
    )
    stmt.run(conversationId)
  }

  insertList(sessions) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO participant_session VALUES (@conversation_id, @user_id, @session_id, @sent_to_server, @created_at)'
    )
    const insertMany = db.transaction((sessions) => {
      for (const item of sessions) {
        stmt.run(item)
      }
    })
    insertMany(sessions)
  }
}

export default new ParticipantSessionDao()
