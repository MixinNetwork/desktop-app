const Database = require('better-sqlite3')

let mixinDb

export function openDb(dbPath) {
  if (mixinDb) return
  mixinDb = new Database(dbPath, { readonly: false })
  return mixinDb
}

export function getMediaMessages() {
  if (!mixinDb) return
  return mixinDb
    .prepare(
      'SELECT category, conversation_id as conversationId, message_id as messageId, media_url as mediaUrl FROM messages WHERE media_url IS NOT NULL'
    )
    .all()
}

export function updateMediaMessage(mediaUrl, messageId) {
  if (!mixinDb) return
  return mixinDb.prepare('UPDATE messages SET media_url = ? WHERE message_id = ?').run([mediaUrl, messageId])
}
