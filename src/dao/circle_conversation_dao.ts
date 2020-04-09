import db from '@/persistence/db'

class CircleConversationDao {
  insert(list: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO circle_conversations VALUES (@conversation_id, @circle_id, @user_id, @created_at, @pin_time)'
    )
    const insertMany = db.transaction((list: any) => {
      for (const item of list) {
        stmt.run(item)
      }
    })
    insertMany(list)
  }

  updateConversationPinTimeById(conversationId: string, circleId: string, pinTime?: string) {
    db.prepare(`UPDATE circle_conversations SET pin_time = ? WHERE conversation_id = ? AND circle_id = ?`).run([
      pinTime,
      conversationId,
      circleId
    ])
  }

  deleteByIds(conversationId: string, circleId: string) {
    db.prepare(`DELETE FROM circle_conversations WHERE conversation_id = ? AND circle_id = ?`).run([
      conversationId,
      circleId
    ])
  }

  findCircleConversationByCircleId(circleId: string, conversationId?: string) {
    if (conversationId) {
      return db
        .prepare(`SELECT * FROM circle_conversations WHERE circle_id = ? AND conversation_id = ?`)
        .get([circleId, conversationId])
    }
    return db.prepare(`SELECT * FROM circle_conversations WHERE circle_id = ?`).all(circleId)
  }

  deleteByCircleId(circleId: string) {
    db.prepare(`DELETE FROM circle_conversations WHERE circle_id = ?`).run(circleId)
  }

  getCircleConversationCount(conversationId: string) {
    return db.prepare(`SELECT count(1) FROM circle_conversations WHERE conversation_id = ?`).get(conversationId)['count(1)']
  }
}

export default new CircleConversationDao()
