import db from '@/persistence/db'

class CircleDao {
  observeAllCircles() {
    return db.prepare('SELECT * FROM circles').all()
  }

  observeCirclesByConversationId(conversationId: string) {
    return db
      .prepare(
        `SELECT c.* FROM circle_conversations cc
        INNER JOIN circles c ON c.circle_id = cc.circle_id
        WHERE conversation_id = ?`
      )
      .all([conversationId])
  }

  observeAllCircleItem() {
    return db
      .prepare(
        'SELECT ci.circle_id, ci.name, ci.created_at, count(c.conversation_id) as count, sum(c.unseen_message_count) as unseen_message_count FROM circles ci LEFT JOIN circle_conversations cc ON ci.circle_id==cc.circle_id LEFT JOIN conversations c  ON c.conversation_id == cc.conversation_id  GROUP BY ci.circle_id'
      )
      .all()
  }

  observeConversationsByCircleId(circleId: string) {
    return db
      .prepare(
        `SELECT c.conversation_id AS conversationId, c.icon_url AS groupIconUrl, c.category AS category,
        c.name AS groupName, c.status AS status, c.last_read_message_id AS lastReadMessageId,
        c.unseen_message_count AS unseenMessageCount, c.owner_id AS ownerId, c.pin_time AS pinTime, c.mute_until AS muteUntil,
        ou.avatar_url AS avatarUrl, ou.full_name AS name, ou.is_verified AS ownerVerified,
        ou.identity_number AS ownerIdentityNumber, ou.mute_until AS ownerMuteUntil, ou.app_id AS appId,
        m.content AS content, m.category AS contentType, m.created_at AS createdAt, m.media_url AS mediaUrl,
        m.user_id AS senderId, m.action AS actionName, m.status AS messageStatus,
        mu.full_name AS senderFullName, s.type AS SnapshotType,
        pu.full_name AS participantFullName, pu.user_id AS participantUserId,
        (SELECT count(*) FROM message_mentions me WHERE me.conversation_id = c.conversation_id AND me.has_read = 0) AS mentionCount,  
        mm.mentions AS mentions 
        FROM circle_conversations cc
        INNER JOIN conversations c ON cc.conversation_id = c.conversation_id
        INNER JOIN circles ci ON ci.circle_id = ?
        INNER JOIN users ou ON ou.user_id = c.owner_id
        LEFT JOIN messages m ON c.last_message_id = m.id
        LEFT JOIN message_mentions mm ON mm.message_id = m.id
        LEFT JOIN users mu ON mu.user_id = m.user_id
        LEFT JOIN snapshots s ON s.snapshot_id = m.snapshot_id
        LEFT JOIN users pu ON pu.user_id = m.participant_id 
        WHERE c.category IS NOT NULL 
        ORDER BY cc.pin_time DESC, 
        CASE 
            WHEN m.created_at is NULL THEN c.created_at
            ELSE m.created_at 
        END 
        DESC
        `
      )
      .all([circleId])
  }
}

export default new CircleDao()
