import db from '@/persistence/db'

class CircleDao {
  insert(data: any) {
    const stmt = db.prepare('INSERT OR REPLACE INTO circles VALUES (@circle_id, @name, @created_at, @ordered_at)')
    stmt.run(data)
  }

  findAllCircles() {
    return db.prepare('SELECT * FROM circles').all()
  }

  findCirclesByConversationId(conversationId: string) {
    return db
      .prepare(
        `SELECT c.* FROM circle_conversations cc
        INNER JOIN circles c ON c.circle_id = cc.circle_id
        WHERE conversation_id = ?`
      )
      .all(conversationId)
  }

  findAllCircleItem() {
    return db
      .prepare(
        `SELECT ci.circle_id, ci.name, ci.created_at, count(c.conversation_id) as count, sum(c.unseen_message_count) as unseen_message_count 
        FROM circles ci LEFT JOIN circle_conversations cc ON ci.circle_id = cc.circle_id LEFT JOIN conversations c  ON c.conversation_id = cc.conversation_id
        GROUP BY ci.circle_id ORDER BY ci.ordered_at ASC, ci.created_at ASC`
      )
      .all()
  }

  findIncludeCircleItem(conversationId: string) {
    return db
      .prepare(
        `SELECT ci.circle_id, ci.name, count(c.conversation_id) as count FROM circles ci LEFT JOIN circle_conversations cc ON ci.circle_id=cc.circle_id
        LEFT JOIN conversations c ON c.conversation_id = cc.conversation_id
        WHERE ci.circle_id IN (
        SELECT cir.circle_id FROM circles cir LEFT JOIN circle_conversations ccr ON cir.circle_id = ccr.circle_id WHERE ccr.conversation_id = ?)
        GROUP BY ci.circle_id
        ORDER BY ci.ordered_at ASC, ci.created_at DESC`
      )
      .all(conversationId)
  }

  findOtherCircleItem(conversationId: string) {
    return db
      .prepare(
        `SELECT ci.circle_id,  ci.name, count(c.conversation_id) as count FROM circles ci LEFT JOIN circle_conversations cc ON ci.circle_id=cc.circle_id
        LEFT JOIN conversations c  ON c.conversation_id = cc.conversation_id
        WHERE ci.circle_id NOT IN (
        SELECT cir.circle_id FROM circles cir LEFT JOIN circle_conversations ccr ON cir.circle_id = ccr.circle_id WHERE ccr.conversation_id = ?)
        GROUP BY ci.circle_id
        ORDER BY ci.ordered_at ASC, ci.created_at DESC`
      )
      .all(conversationId)
  }

  findConversationsByCircleId(circleId: string) {
    return db
      .prepare(
        `SELECT c.conversation_id AS conversationId, c.icon_url AS groupIconUrl, c.category AS category,
        c.name AS groupName, c.status AS status, c.last_read_message_id AS lastReadMessageId,
        c.unseen_message_count AS unseenMessageCount, c.owner_id AS ownerId, cc.pin_time AS pinTime, c.mute_until AS muteUntil,
        ou.avatar_url AS avatarUrl, ou.full_name AS name, ou.is_verified AS ownerVerified,
        ou.identity_number AS ownerIdentityNumber, ou.mute_until AS ownerMuteUntil, ou.app_id AS appId,
        m.content AS content, m.category AS contentType, m.created_at AS createdAt, m.media_url AS mediaUrl,
        m.user_id AS senderId, m.action AS actionName, m.status AS messageStatus,
        mu.full_name AS senderFullName, s.type AS snapshotType,
        pu.full_name AS participantFullName, pu.user_id AS participantUserId,
        (SELECT count(*) FROM message_mentions me WHERE me.conversation_id = c.conversation_id AND me.has_read = 0) AS mentionCount,  
        mm.mentions AS mentions 
        FROM circle_conversations cc
        INNER JOIN conversations c ON cc.conversation_id = c.conversation_id
        INNER JOIN circles ci ON ci.circle_id = cc.circle_id 
        INNER JOIN users ou ON ou.user_id = c.owner_id
        LEFT JOIN messages m ON c.last_message_id = m.message_id
        LEFT JOIN message_mentions mm ON mm.message_id = m.message_id
        LEFT JOIN users mu ON mu.user_id = m.user_id
        LEFT JOIN snapshots s ON s.snapshot_id = m.snapshot_id
        LEFT JOIN users pu ON pu.user_id = m.participant_id 
        WHERE c.category IS NOT NULL AND cc.circle_id = ?
        ORDER BY cc.pin_time DESC, 
            CASE 
                WHEN m.created_at is NULL THEN c.created_at
                ELSE m.created_at 
            END 
            DESC
        `
      )
      .all(circleId)
  }

  deleteCircleById(circleId: string) {
    db.prepare(`DELETE FROM circles WHERE circle_id = ?`).run(circleId)
  }

  findCircleById(circleId: string) {
    return db.prepare(`SELECT * FROM circles WHERE circle_id = ?`).get(circleId)
  }

  findConversationItemByCircleId(circleId: string) {
    return db
      .prepare(
        `SELECT c.conversation_id AS conversationId, c.icon_url AS groupIconUrl, c.category AS category,
          c.name AS groupName, c.status AS status, c.last_read_message_id AS lastReadMessageId,
          c.unseen_message_count AS unseenMessageCount, c.owner_id AS ownerId, c.pin_time AS pinTime, c.mute_until AS muteUntil,
          ou.avatar_url AS avatarUrl, ou.full_name AS name, ou.is_verified AS ownerVerified,
          ou.identity_number AS ownerIdentityNumber, ou.mute_until AS ownerMuteUntil, ou.app_id AS appId,
          m.content AS content, m.category AS contentType, m.created_at AS createdAt, m.media_url AS mediaUrl,
          m.user_id AS senderId, m.action AS actionName, m.status AS messageStatus,
          mu.full_name AS senderFullName, s.type AS snapshotType,
          pu.full_name AS participantFullName, pu.user_id AS participantUserId,
          (SELECT count(*) FROM message_mentions me WHERE me.conversation_id = c.conversation_id AND me.has_read = 0) AS mentionCount,  
          mm.mentions AS mentions 
          FROM circle_conversations cc
          INNER JOIN conversations c ON cc.conversation_id = c.conversation_id
          INNER JOIN circles ci ON ci.circle_id = ?
          INNER JOIN users ou ON ou.user_id = c.owner_id
          LEFT JOIN messages m ON c.last_message_id = m.message_id
          LEFT JOIN message_mentions mm ON mm.message_id = m.message_id
          LEFT JOIN users mu ON mu.user_id = m.user_id
          LEFT JOIN snapshots s ON s.snapshot_id = m.snapshot_id
          LEFT JOIN users pu ON pu.user_id = m.participant_id 
          WHERE c.category IS NOT NULL 
          `
      )
      .all(circleId)
  }

  updateOrderAt(circleId: string, orderAt: string) {
    db.prepare(`UPDATE circles SET ordered_at = ? WHERE circle_id = ?`).run([orderAt, circleId])
  }

  findOtherCircleUnread(circleId: String) {
    return db
      .prepare(
        `SELECT sum(c.unseen_message_count) as unseen_message_count 
        FROM circles ci 
        LEFT JOIN circle_conversations cc ON ci.circle_id = cc.circle_id 
        LEFT JOIN conversations c ON c.conversation_id = cc.conversation_id 
        WHERE ci.circle_id != ?`
      )
      .get(circleId)
  }

  findCircleByConversationId(conversationId: String) {
    return db
      .prepare(
        `SELECT * FROM circles ci 
        LEFT JOIN circle_conversations cc ON ci.circle_id = cc.circle_id 
        LEFT JOIN conversations c ON c.conversation_id = cc.conversation_id
        WHERE cc.conversation_id = ?`
      )
      .get(conversationId)
  }
}

export default new CircleDao()
