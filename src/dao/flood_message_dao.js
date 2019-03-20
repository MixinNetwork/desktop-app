import db from '@/persistence/db'

class FloodMessageDao {
  insert(messageId, data, createdAt) {
    const stmt = db.prepare('INSERT OR REPLACE INTO flood_messages(message_id,data,created_at) VALUES (?,?,?)')
    stmt.run(messageId, data, createdAt)
  }
  findFloodMessage() {
    const stmt = db.prepare('SELECT * FROM flood_messages ORDER BY created_at ASC LIMIT 10')
    return stmt.all()
  }
  delete(messageId) {
    db.prepare('DELETE FROM flood_messages WHERE message_id = ?').run(messageId)
  }
}

export default new FloodMessageDao()
