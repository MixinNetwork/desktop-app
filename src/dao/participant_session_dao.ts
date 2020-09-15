import db from '@/persistence/db'

class ParticipantSessionDao {
  insert(sessionParticipant: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO participant_session VALUES (@conversation_id, @user_id, @session_id, @sent_to_server, @created_at)'
    )
    stmt.run(sessionParticipant)
  }

  insertAll(sessionParticipants: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO participant_session VALUES (@conversation_id, @user_id, @session_id, @sent_to_server, @created_at)'
    )
    for (const sessionParticipant of sessionParticipants) {
      stmt.run(sessionParticipant)
    }
  }

  getParticipantSessionsByConversationId(conversationId: any) {
    return db.prepare('SELECT * FROM participant_session WHERE conversation_id = ?').all(conversationId)
  }

  getNotSendSessionParticipants(conversationId: any, sessionId: any) {
    return db
      .prepare(
        'SELECT p.* FROM participant_session p LEFT JOIN users u ON p.user_id = u.user_id WHERE p.conversation_id = ? AND p.session_id != ? AND u.app_id IS NULL AND p.sent_to_server IS NULL'
      )
      .all(conversationId, sessionId)
  }

  getParticipantsSession(conversationId: any) {
    return db.prepare('SELECT * FROM participant_session WHERE conversation_id = ?').all(conversationId)
  }

  updateList(sessionParticipants: any) {
    const stmt = db.prepare(
      'UPDATE participant_session SET sent_to_server = @sent_to_server, created_at = @created_at WHERE conversation_id = @conversation_id AND user_id = @user_id AND session_id = @session_id'
    )
    for (const participant of sessionParticipants) {
      stmt.run(participant)
    }
  }

  deleteByConversationId(conversationId: any) {
    const stmt = db.prepare('DELETE FROM participant_session WHERE conversation_id = ?')
    stmt.run(conversationId)
  }

  replaceAll(conversationId: any, participantSessions: any) {
    const deleteStmt = db.prepare('DELETE FROM participant_session WHERE conversation_id = ?')
    const insertStmt = db.prepare(
      'INSERT OR REPLACE INTO participant_session(conversation_id, user_id, session_id, created_at) VALUES (@conversation_id, @user_id, @session_id, @created_at)'
    )
    const insertMany = db.transaction((conversationId: any, participantSessions: any) => {
      deleteStmt.run(conversationId)
      for (const participantSession of participantSessions) {
        insertStmt.run(participantSession)
      }
    })
    insertMany(conversationId, participantSessions)
  }

  deleteList(del: any) {
    const deleteStmt = db.prepare(
      'DELETE FROM participant_session WHERE conversation_id = ? AND user_id = ? AND session_id = ?'
    )
    const deleteMany = db.transaction((del: any) => {
      for (const item of del) {
        deleteStmt.run(item.conversation_id, item.user_id, item.session_id)
      }
    })
    deleteMany(del)
  }

  delete(conversationId: any, participantId: any) {
    const stmt = db.prepare('DELETE FROM participant_session WHERE conversation_id = ? AND user_id = ?')
    stmt.run(conversationId, participantId)
  }

  updateStatusByConversationId(conversationId: any) {
    const stmt = db.prepare('UPDATE participant_session SET sent_to_server = NULL WHERE conversation_id = ?')
    stmt.run(conversationId)
  }

  deleteByUserIdAndSessionId(userId: String, sessionId: String) {
    const stmt = db.prepare('DELETE FROM participant_session WHERE user_id = ? AND session_id = ?')
    stmt.run(userId, sessionId)
  }

  insertList(sessions: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO participant_session VALUES (@conversation_id, @user_id, @session_id, @sent_to_server, @created_at)'
    )
    const insertMany = db.transaction((sessions: any) => {
      for (const item of sessions) {
        stmt.run(item)
      }
    })
    insertMany(sessions)
  }
}

export default new ParticipantSessionDao()
