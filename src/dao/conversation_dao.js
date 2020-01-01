import db from '@/persistence/db'

class ConversationDao {
  getConversationByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM conversations WHERE owner_id=? AND category = "CONTACT"')
    return stmt.get(userId)
  }

  getConversations() {
    return db
      .prepare(
        'SELECT c.conversation_id AS conversationId, c.icon_url AS groupIconUrl, c.category AS category, ' +
          'c.name AS groupName, c.status AS status, c.last_read_message_id AS lastReadMessageId, ' +
          'c.unseen_message_count AS unseenMessageCount, c.announcement AS announcement, c.owner_id AS ownerId, c.pin_time AS pinTime, c.mute_until AS muteUntil, ' +
          'ou.avatar_url AS avatarUrl, ou.full_name AS name, ou.is_verified AS ownerVerified, ' +
          'ou.identity_number AS ownerIdentityNumber, ou.mute_until AS ownerMuteUntil, ou.app_id AS appId, ' +
          'm.content AS content, m.category AS contentType, m.created_at AS createdAt, m.media_url AS mediaUrl, ' +
          'm.user_id AS senderId, m.action AS actionName, m.status AS messageStatus, ' +
          'mu.full_name AS senderFullName, s.type AS SnapshotType,  ' +
          'pu.full_name AS participantFullName, pu.user_id AS participantUserId ' +
          'FROM conversations c ' +
          'INNER JOIN users ou ON ou.user_id = c.owner_id ' +
          'LEFT JOIN messages m ON c.last_message_id = m.message_id ' +
          'LEFT JOIN users mu ON mu.user_id = m.user_id ' +
          'LEFT JOIN snapshots s ON s.snapshot_id = m.snapshot_id ' +
          'LEFT JOIN users pu ON pu.user_id = m.participant_id ' +
          'WHERE c.category IS NOT NULL ' +
          'ORDER BY c.pin_time DESC, m.created_at DESC'
      )
      .all()
  }

  getConversationsIds() {
    return db
      .prepare(
        'SELECT c.conversation_id AS conversationId ' +
          'FROM conversations c ' +
          'LEFT JOIN messages m ON c.last_message_id = m.message_id ' +
          'WHERE c.category IS NOT NULL ' +
          'ORDER BY c.pin_time DESC, m.created_at DESC'
      )
      .all()
  }

  getConversationItemByConversationId(conversationId) {
    return db
      .prepare(
        'SELECT c.conversation_id AS conversationId, c.icon_url AS groupIconUrl, c.category AS category, ' +
          'c.draft AS draft, c.name AS groupName, c.status AS status, c.last_read_message_id AS lastReadMessageId, ' +
          'c.unseen_message_count AS unseenMessageCount, c.announcement AS announcement, c.owner_id AS ownerId, c.pin_time AS pinTime, c.mute_until AS muteUntil, ' +
          'ou.avatar_url AS avatarUrl, ou.full_name AS name, ou.biography AS biography, ou.is_verified AS ownerVerified, ' +
          'ou.identity_number AS ownerIdentityNumber, ou.mute_until AS ownerMuteUntil, ou.app_id AS appId, ' +
          'm.content AS content, m.category AS contentType, m.created_at AS createdAt, m.media_url AS mediaUrl, ' +
          'm.user_id AS senderId, m.action AS actionName, m.status AS messageStatus, ' +
          'mu.full_name AS senderFullName, s.type AS SnapshotType,  ' +
          'pu.full_name AS participantFullName, pu.user_id AS participantUserId ' +
          'FROM conversations c ' +
          'INNER JOIN users ou ON ou.user_id = c.owner_id ' +
          'LEFT JOIN messages m ON c.last_message_id = m.message_id ' +
          'LEFT JOIN users mu ON mu.user_id = m.user_id ' +
          'LEFT JOIN snapshots s ON s.snapshot_id = m.snapshot_id ' +
          'LEFT JOIN users pu ON pu.user_id = m.participant_id ' +
          'WHERE c.category IS NOT NULL AND c.conversation_id = ?'
      )
      .get(conversationId)
  }

  getSimpleConversationItem(conversationId) {
    return db
      .prepare(
        'SELECT c.conversation_id AS conversationId, c.icon_url AS groupIconUrl, c.category AS category, ' +
          'c.draft AS draft, c.name AS groupName, c.status AS status, c.last_read_message_id AS lastReadMessageId, ' +
          'c.unseen_message_count AS unseenMessageCount, c.owner_id AS ownerId, c.pin_time AS pinTime, c.mute_until AS muteUntil, ' +
          'ou.avatar_url AS avatarUrl, ou.full_name AS name, ou.is_verified AS ownerVerified, ' +
          'ou.identity_number AS ownerIdentityNumber, ou.mute_until AS ownerMuteUntil ' +
          'FROM conversations c ' +
          'INNER JOIN users ou ON ou.user_id = c.owner_id ' +
          'WHERE c.conversation_id = ?'
      )
      .get(conversationId)
  }

  getConversationById(conversationId) {
    return db.prepare('SELECT * FROM conversations where conversation_id = ?').get(conversationId)
  }

  getConversationsByUserId(userId) {
    return db
      .prepare(
        'select c.conversation_id from conversations c inner join users u on c.owner_id = u.user_id ' +
          'left join participants p on p.conversation_id = c.conversation_id ' +
          'where p.user_id = ? AND u.app_id IS NULL'
      )
      .all(userId)
  }

  updateConversationStatusById(conversationId, status) {
    return db.prepare('UPDATE conversations SET status = ? WHERE conversation_id = ?').run(status, conversationId)
  }

  fuzzySearchConversation(keyword) {
    return db
      .prepare(
        'SELECT c.conversation_id AS conversationId, c.icon_url AS groupIconUrl, c.category AS category, ' +
          'c.name AS groupName, c.status AS status, c.last_read_message_id AS lastReadMessageId, ' +
          'c.unseen_message_count AS unseenMessageCount, c.announcement AS announcement, c.owner_id AS ownerId, c.pin_time AS pinTime, c.mute_until AS muteUntil, ' +
          'ou.avatar_url AS avatarUrl, ou.full_name AS name, ou.is_verified AS ownerVerified, ' +
          'ou.identity_number AS ownerIdentityNumber, ou.mute_until AS ownerMuteUntil, ou.app_id AS appId, ' +
          'm.content AS content, m.category AS contentType, m.created_at AS createdAt, m.media_url AS mediaUrl, ' +
          'm.user_id AS senderId, m.action AS actionName, m.status AS messageStatus, ' +
          'mu.full_name AS senderFullName, s.type AS SnapshotType,  ' +
          'pu.full_name AS participantFullName, pu.user_id AS participantUserId ' +
          'FROM conversations c ' +
          'INNER JOIN users ou ON ou.user_id = c.owner_id ' +
          'LEFT JOIN messages m ON c.last_message_id = m.message_id ' +
          'LEFT JOIN users mu ON mu.user_id = m.user_id ' +
          'LEFT JOIN snapshots s ON s.snapshot_id = m.snapshot_id ' +
          'LEFT JOIN users pu ON pu.user_id = m.participant_id ' +
          `WHERE c.category IS NOT NULL AND (c.category = 'GROUP' AND c.name LIKE '%${keyword}%') ` +
          `OR (c.category = 'CONTACT' AND ou.relationship != 'FRIEND' AND (ou.full_name LIKE '%${keyword}%' ` +
          `OR ou.identity_number LIKE '%${keyword}%')) ` +
          'ORDER BY c.pin_time DESC, m.created_at DESC'
      )
      .all()
  }

  updateConversationDraftById(conversationId, draft) {
    return db.prepare('UPDATE conversations SET draft = ? WHERE conversation_id = ?').run(draft, conversationId)
  }

  insertConversation(conversation) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO conversations VALUES (@conversation_id, @owner_id, @category, ' +
        '@name, @icon_url, @announcement, @code_url, @pay_type, @created_at, @pin_time, ' +
        '@last_message_id, @last_read_message_id, @unseen_message_count, @status, @draft, @mute_until)'
    )
    stmt.run(conversation)
  }

  updateConversation(conversation) {
    const stmt = db.prepare(
      'UPDATE conversations SET owner_id = @owner_id, category = @category, ' +
        'name = @name, announcement = @announcement, mute_until = @mute_until, ' +
        'created_at = @created_at,  status = @status WHERE conversation_id = ?'
    )
    stmt.run(conversation.conversation_id, conversation)
  }

  updateMute(muteUntil, conversationId) {
    const stmt = db.prepare('UPDATE conversations SET mute_until = ? WHERE conversation_id = ?')
    stmt.run(muteUntil, conversationId)
  }

  updateConversationPinTimeById(conversationId, pinTime) {
    const stmt = db.prepare('UPDATE conversations SET pin_time = ? WHERE conversation_id = ?')
    stmt.run([pinTime, conversationId])
  }

  deleteConversation(conversationId) {
    db.prepare('DELETE FROM conversations WHERE conversation_id = ?').run(conversationId)
  }

  indexUnread(conversationId) {
    return db.prepare('SELECT unseen_message_count FROM conversations WHERE conversation_id = ?').get(conversationId)
      .unseen_message_count
  }

  updateUnseenMessageCount(conversationId) {
    const userId = JSON.parse(localStorage.getItem('account')).user_id
    db.prepare(`UPDATE conversations SET unseen_message_count = (SELECT count(1) FROM messages m WHERE m.conversation_id = ? AND m.user_id != '${userId}' AND m.status IN ('SENT', 'DELIVERED')) WHERE conversation_id = ? `).run(conversationId, conversationId)
  }
}

export default new ConversationDao()
