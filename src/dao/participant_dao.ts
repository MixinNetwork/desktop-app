import db from '@/persistence/db'

class ParticipantDao {
  insert(participant: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO participants VALUES (@conversation_id, @user_id, @role, @created_at)'
    )
    stmt.run(participant)
  }
  insertAll(participants: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO participants VALUES (@conversation_id, @user_id, @role, @created_at)'
    )
    for (const participant of participants) {
      stmt.run(participant)
    }
  }

  deleteAll(conversationId: any, participantIds: any) {
    const stmt = db.prepare('DELETE FROM participants WHERE conversation_id = ? AND user_id = ? ')
    const deleteMany = db.transaction((ids: any) => {
      for (const id of ids) {
        stmt.run([conversationId, id])
      }
    })
    deleteMany(participantIds)
  }

  getParticipantsByConversationId(conversationId: any) {
    return db
      .prepare(
        'SELECT u.user_id, u.identity_number, u.full_name, u.app_id, p.role, u.avatar_url, u.relationship FROM participants p, users u WHERE p.conversation_id = ? AND p.user_id = u.user_id ORDER BY p.created_at DESC'
      )
      .all(conversationId)
  }
  getParticipants(conversationId: any) {
    return db.prepare('SELECT * FROM participants WHERE conversation_id = ?').all(conversationId)
  }
  getParticipantsId(conversationId: any) {
    return db.prepare('SELECT user_id FROM participants WHERE conversation_id = ?').all(conversationId)
  }
  updateParticipantRole(conversationId: any, userId: any, role: any) {
    db.prepare('UPDATE participants SET role = ? where conversation_id = ? AND user_id = ?').run([
      role,
      conversationId,
      userId
    ])
  }
  getRandomJoinConversationId(userId: any) {
    return db.prepare('SELECT p.conversation_id FROM participants p, conversations c WHERE p.user_id = ? AND p.conversation_id = c.conversation_id AND c.status = 2 LIMIT 1').get(userId).conversation_id
  }
}

export default new ParticipantDao()
