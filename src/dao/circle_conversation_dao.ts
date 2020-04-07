import db from '@/persistence/db'

class CircleConversationDao {
  updateConversationPinTimeById(conversationId: string, circleId: string, pinTime?: string) {
    db.prepare(`UPDATE circle_conversations SET pin_time = ? WHERE conversation_id = ? AND circle_id = ?`).run([pinTime, conversationId, circleId])
  }

  deleteByIds(conversationId: string, circleId: string) {
    db.prepare(`DELETE FROM circle_conversations WHERE conversation_id = ? AND circle_id = ?`).run([conversationId, circleId])
  }

  findCircleConversationByCircleId(circleId: string, conversationId?: string) {
    if (conversationId) {
      return db.prepare(`SELECT * FROM circle_conversations WHERE circle_id = ? AND conversation_id = ?`).get([circleId, conversationId])
    }
    return db.prepare(`SELECT * FROM circle_conversations WHERE circle_id = ?`).all(circleId)
  }

  deleteByCircleId(circleId: string) {
    db.prepare(`DELETE FROM circle_conversations WHERE circle_id = ?`).run(circleId)
  }
}

export default new CircleConversationDao()
