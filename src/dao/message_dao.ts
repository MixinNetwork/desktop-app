import moment from 'moment'
// @ts-ignore
import { v4 as uuidv4 } from 'uuid'
import db from '@/persistence/db'
import { getAccount } from '@/utils/util'
import contentUtil from '@/utils/content_util'
import messageMentionDao from '@/dao/message_mention_dao'
import { PerPageMessageCount, getCompleteMessage, messageType } from '@/utils/constants'

class MessageDao {
  me() {
    const account: any = getAccount()
    return account
  }

  insertOrReplaceMessageFts(messageId: string, content: string) {
    if (!content) return
    const contentFinal = contentUtil.fts5ContentFilter(content)
    setTimeout(() => {
      const insert = db.prepare('INSERT OR REPLACE INTO messages_fts (message_id, content) VALUES (?,?)')
      insert.run([messageId, contentFinal])
    })
  }

  insertOrReplaceMessageFtsWrapper(message: any) {
    if (messageType(message.category) === 'text') {
      this.insertOrReplaceMessageFts(message.message_id, message.content)
    }
    if (messageType(message.category) === 'file') {
      this.insertOrReplaceMessageFts(message.message_id, message.name)
    }
    if (messageType(message.category) === 'post') {
      const content = contentUtil.renderMdToText(message.content)
      this.insertOrReplaceMessageFts(message.message_id, content)
    }
  }

  deleteMessageFts(msgIds: string[]) {
    const stmt = db.prepare('DELETE FROM messages_fts WHERE message_id = ?')
    const deleteMany = db.transaction((msgIds: any) => {
      for (const id of msgIds) {
        stmt.run(id)
      }
    })
    deleteMany(msgIds)
  }

  insertTextMessage(message: { conversationId: any; category: any; content: any; status: any }) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO messages(message_id,conversation_id,user_id,category,content,status,created_at) VALUES (?,?,?,?,?,?,?)'
    )
    const senderId = this.me().user_id
    const createdAt = new Date().toISOString()
    const messageId = uuidv4().toLowerCase()
    stmt.run([
      messageId,
      message.conversationId,
      senderId,
      message.category,
      message.content,
      message.status,
      createdAt
    ])
    let content = message.content
    if (messageType(message.category) === 'post') {
      content = contentUtil.renderMdToText(content)
    } else if (messageType(message.category) === 'text') {
      contentUtil.parseMention(message.content, message.conversationId, messageId, messageMentionDao)
    }
    this.insertOrReplaceMessageFts(messageId, content)
    return messageId
  }

  insertContactMessage(message: { conversationId: any; sharedUserId: any; category: any; content: any; status: any }) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO messages(message_id,conversation_id,user_id,shared_user_id,category,content,status,created_at) VALUES (?,?,?,?,?,?,?,?)'
    )
    const senderId = this.me().user_id
    const createdAt = new Date().toISOString()
    const messageId = uuidv4().toLowerCase()
    stmt.run([
      messageId,
      message.conversationId,
      senderId,
      message.sharedUserId,
      message.category,
      message.content,
      message.status,
      createdAt
    ])
    return messageId
  }

  insertRelyMessage(
    message: { conversationId: any; category: any; content: any; status: any },
    quoteMessageId: any,
    quoteContent: any
  ) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO messages(message_id,conversation_id,user_id,category,content,status,created_at,quote_message_id,quote_content) VALUES (?,?,?,?,?,?,?,?,?)'
    )
    const senderId = this.me().user_id
    const createdAt = new Date().toISOString()
    const messageId = uuidv4().toLowerCase()
    stmt.run([
      messageId,
      message.conversationId,
      senderId,
      message.category,
      message.content,
      message.status,
      createdAt,
      quoteMessageId,
      quoteContent
    ])
    if (messageType(message.category) === 'text') {
      this.insertOrReplaceMessageFts(messageId, message.content)
      contentUtil.parseMention(message.content, message.conversationId, messageId, messageMentionDao)
    }
    return messageId
  }

  insertMessage(message: any) {
    const finalMsg = getCompleteMessage(message)

    const stmt = db.prepare(
      'INSERT OR REPLACE INTO messages VALUES (@message_id, @conversation_id, @user_id, @category, @content, @media_url, @media_mime_type, @media_size, @media_duration, @media_width, @media_height, @media_hash, @thumb_image, @media_key, @media_digest, @media_status, @status, @created_at, @action, @participant_id, @snapshot_id, @hyperlink, @name, @album_id, @sticker_id, @shared_user_id, @media_waveform, @quote_message_id, @quote_content, @thumb_url)'
    )
    stmt.run(finalMsg)
    this.insertOrReplaceMessageFtsWrapper(message)
  }

  insertMessages(messages: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO messages VALUES (@message_id, @conversation_id, @user_id, @category, @content, @media_url, @media_mime_type, @media_size, @media_duration, @media_width, @media_height, @media_hash, @thumb_image, @media_key, @media_digest, @media_status, @status, @created_at, @action, @participant_id, @snapshot_id, @hyperlink, @name, @album_id, @sticker_id, @shared_user_id, @media_waveform, @quote_message_id, @quote_content, @thumb_url)'
    )
    const insertMany = db.transaction((messages: any) => {
      for (const message of messages) {
        const finalMsg = getCompleteMessage(message)
        stmt.run(finalMsg)
        this.insertOrReplaceMessageFtsWrapper(message)
      }
    })
    insertMany(messages)
  }

  deleteMessageByIds(mIds: any) {
    const stmt = db.prepare('DELETE FROM messages WHERE message_id = ?')
    const insertMany = db.transaction((mIds: any) => {
      for (let mId of mIds) {
        stmt.run(mId)
      }
    })
    insertMany(mIds)
    this.deleteMessageFts(mIds)
  }

  ftsMessagesDelete(conversationId: any) {
    return db
      .prepare(
        'DELETE FROM messages_fts WHERE message_id = (SELECT message_id from messages WHERE conversation_id = ?)'
      )
      .run(conversationId)
  }

  ftsMessageIndex(conversationId: any, messageId: any) {
    const messageIdList = db
      .prepare('SELECT message_id FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(conversationId)
    let index = messageIdList.length - 1
    for (let i = 0; i < messageIdList.length; i++) {
      if (messageIdList[i].message_id === messageId) {
        index = i
        break
      }
    }
    return index
  }

  ftsMessageCount(conversationId?: any, keyword?: any) {
    if (conversationId) {
      if (!keyword) {
        const data = db.prepare('SELECT count(message_id) FROM messages WHERE conversation_id = ?').get(conversationId)
        return data['count(message_id)']
      }
      const keywordFinal = contentUtil.fts5KeywordFilter(keyword)
      if (!keywordFinal) return 0
      const data = db
        .prepare(
          `SELECT m.message_id FROM messages_fts m_fts
            INNER JOIN messages m ON m.message_id = m_fts.message_id
            LEFT JOIN users u ON m.user_id = u.user_id
            WHERE m.conversation_id = ?
            AND m.category IN ('SIGNAL_TEXT', 'PLAIN_TEXT', 'SIGNAL_DATA', 'PLAIN_DATA', 'SIGNAL_POST', 'PLAIN_POST')
            AND m_fts.content MATCH ?
            AND m.status != 'FAILED'`
        )
        .all(conversationId, keywordFinal)
      if (!data) return 0
      const msgIdMap: any = {}
      data.forEach((item: any) => {
        msgIdMap[item.message_id] = 1
      })
      return Object.keys(msgIdMap).length
    }
    const data = db.prepare('SELECT count(message_id) FROM messages_fts').get()
    return data['count(message_id)']
  }

  ftsMessageLoad(conversationId: any) {
    const messages = db
      .prepare('SELECT message_id,category,content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(conversationId)
    const insert = db.prepare(
      'INSERT OR REPLACE INTO messages_fts (message_id, content) VALUES (@message_id, @content)'
    )
    const insertMany = db.transaction((messages: any[]) => {
      messages.forEach((message: any) => {
        if (message.content && messageType(message.category) === 'text') {
          message.content = contentUtil.fts5ContentFilter(message.content)
          insert.run(message)
        }
        if (message.name && messageType(message.category) === 'file') {
          message.content = contentUtil.fts5ContentFilter(message.name)
          insert.run(message)
        }
        if (message.content && messageType(message.category) === 'post') {
          message.content = contentUtil.renderMdToText(message.content)
          message.content = contentUtil.fts5ContentFilter(message.content)
          insert.run(message)
        }
      })
    })
    insertMany(messages)
  }

  ftsMessageQuery(conversationId: any, keyword: any, limit: number = 100, offset: number = 0) {
    const keywordFinal = contentUtil.fts5KeywordFilter(keyword)
    if (!keywordFinal) return []
    return db
      .prepare(
        `SELECT m.message_id,m.conversation_id,m.content,m.category,m.name,m.created_at,u.full_name,m.user_id,u.avatar_url
        FROM messages_fts m_fts
        INNER JOIN messages m ON m.message_id = m_fts.message_id
        LEFT JOIN users u ON m.user_id = u.user_id
        WHERE m.conversation_id = ?
        AND m_fts.content MATCH ?
        AND m.category IN ('SIGNAL_TEXT', 'PLAIN_TEXT', 'SIGNAL_DATA', 'PLAIN_DATA', 'SIGNAL_POST', 'PLAIN_POST')
        AND m.status != 'FAILED'
        ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(conversationId, keywordFinal, limit, offset)
  }

  getMessages(conversationId: any, page = 0, tempCount = 0) {
    const perPageCount = PerPageMessageCount
    const offset = page * perPageCount + tempCount
    const stmt = db.prepare(
      'SELECT * FROM (SELECT m.message_id AS messageId, m.conversation_id AS conversationId, u.user_id AS userId, ' +
        'u.full_name AS userFullName, u.identity_number AS userIdentityNumber, u.app_id AS appId, m.category AS type, ' +
        'm.content AS content, m.created_at AS createdAt, m.status AS status, m.media_status AS mediaStatus, m.media_waveform AS mediaWaveform, ' +
        'm.media_key AS mediaKey, m.media_digest AS mediaDigest, m.name AS mediaName, m.media_mime_type AS mediaMimeType, m.media_size AS mediaSize, m.media_width AS mediaWidth, m.media_height AS mediaHeight, ' +
        'm.thumb_image AS thumbImage, m.thumb_url AS thumbUrl, m.media_url AS mediaUrl, m.media_duration AS mediaDuration, m.quote_message_id as quoteId, m.quote_content as quoteContent, ' +
        'u1.full_name AS participantFullName, m.action AS actionName, u1.user_id AS participantUserId, ' +
        's.snapshot_id AS snapshotId, s.type AS snapshotType, s.amount AS snapshotAmount, a.symbol AS assetSymbol, a.asset_id AS assetId, ' +
        'a.icon_url AS assetIcon, st.asset_url AS assetUrl, st.asset_width AS assetWidth, st.asset_height AS assetHeight, m.sticker_id AS stickerId, ' +
        'st.name AS assetName, st.asset_type AS assetType, h.site_name AS siteName, h.site_title AS siteTitle, h.site_description AS siteDescription, ' +
        'h.site_image AS siteImage, m.shared_user_id AS sharedUserId, su.full_name AS sharedUserFullName, su.identity_number AS sharedUserIdentityNumber, mm.mentions AS mentions, ' +
        'su.avatar_url AS sharedUserAvatarUrl, su.is_verified AS sharedUserIsVerified, su.app_id AS sharedUserAppId, ' +
        'c.name AS groupName ' +
        'FROM messages m ' +
        'INNER JOIN users u ON m.user_id = u.user_id ' +
        'LEFT JOIN users u1 ON m.participant_id = u1.user_id ' +
        'LEFT JOIN snapshots s ON m.snapshot_id = s.snapshot_id ' +
        'LEFT JOIN assets a ON s.asset_id = a.asset_id ' +
        'LEFT JOIN stickers st ON st.sticker_id = m.sticker_id ' +
        'LEFT JOIN hyperlinks h ON m.hyperlink = h.hyperlink ' +
        'LEFT JOIN users su ON m.shared_user_id = su.user_id ' +
        'LEFT JOIN conversations c ON m.conversation_id = c.conversation_id ' +
        'LEFT JOIN message_mentions mm ON m.message_id = mm.message_id ' +
        'WHERE m.conversation_id = ? ' +
        'ORDER BY m.created_at DESC LIMIT ' +
        perPageCount +
        ' OFFSET ?) ORDER BY createdAt ASC'
    )
    let data = stmt.all(conversationId, offset)
    data.forEach(function(e: { lt: string; createdAt: any }) {
      e.lt = moment(e.createdAt).format('HH:mm')
    })
    return data
  }

  getConversationMessageById(cid: string, mid: string) {
    return db
      .prepare(
        'SELECT * FROM (SELECT m.message_id AS messageId, m.conversation_id AS conversationId, u.user_id AS userId, ' +
          'u.full_name AS userFullName, u.identity_number AS userIdentityNumber, u.app_id AS appId, m.category AS type, ' +
          'm.content AS content, m.created_at AS createdAt, m.status AS status, m.media_status AS mediaStatus, m.media_waveform AS mediaWaveform, ' +
          'm.media_key AS mediaKey, m.media_digest AS mediaDigest, m.name AS mediaName, m.media_mime_type AS mediaMimeType, m.media_size AS mediaSize, m.media_width AS mediaWidth, m.media_height AS mediaHeight, ' +
          'm.thumb_image AS thumbImage, m.thumb_url AS thumbUrl, m.media_url AS mediaUrl, m.media_duration AS mediaDuration, m.quote_message_id as quoteId, m.quote_content as quoteContent, ' +
          'u1.full_name AS participantFullName, m.action AS actionName, u1.user_id AS participantUserId, ' +
          's.snapshot_id AS snapshotId, s.type AS snapshotType, s.amount AS snapshotAmount, a.symbol AS assetSymbol, a.asset_id AS assetId, ' +
          'a.icon_url AS assetIcon, st.asset_url AS assetUrl, st.asset_width AS assetWidth, st.asset_height AS assetHeight, m.sticker_id AS stickerId, ' +
          'st.name AS assetName, st.asset_type AS assetType, h.site_name AS siteName, h.site_title AS siteTitle, h.site_description AS siteDescription, ' +
          'h.site_image AS siteImage, m.shared_user_id AS sharedUserId, su.full_name AS sharedUserFullName, su.identity_number AS sharedUserIdentityNumber, mm.mentions AS mentions, ' +
          'su.avatar_url AS sharedUserAvatarUrl, su.is_verified AS sharedUserIsVerified, su.app_id AS sharedUserAppId, ' +
          'c.name AS groupName ' +
          'FROM messages m ' +
          'INNER JOIN users u ON m.user_id = u.user_id ' +
          'LEFT JOIN users u1 ON m.participant_id = u1.user_id ' +
          'LEFT JOIN snapshots s ON m.snapshot_id = s.snapshot_id ' +
          'LEFT JOIN assets a ON s.asset_id = a.asset_id ' +
          'LEFT JOIN stickers st ON st.sticker_id = m.sticker_id ' +
          'LEFT JOIN hyperlinks h ON m.hyperlink = h.hyperlink ' +
          'LEFT JOIN users su ON m.shared_user_id = su.user_id ' +
          'LEFT JOIN conversations c ON m.conversation_id = c.conversation_id ' +
          'LEFT JOIN message_mentions mm ON m.message_id = mm.message_id ' +
          'WHERE m.conversation_id = ? AND m.message_id = ?)'
      )
      .get(cid, mid)
  }

  getSendingMessage(messageId: string) {
    const stmt = db.prepare(`
      SELECT m.message_id, m.conversation_id, m.user_id, m.category, m.content, m.media_url, m.media_mime_type,
      m.media_size, m.media_duration, m.media_width, m.media_height, m.media_hash, m.thumb_image, m.media_key,
      m.media_digest, m.media_status, m.status, m.created_at, m.action, m.participant_id, m.snapshot_id, m.hyperlink,
      m.name, m.album_id, m.sticker_id, m.shared_user_id, m.media_waveform, m.quote_message_id, m.quote_content,
      rm.status as resend_status, rm.user_id as resend_user_id, rm.session_id as resend_session_id
      FROM messages m LEFT JOIN resend_session_messages rm on m.message_id = rm.message_id
      WHERE m.message_id = ? AND (m.status = 'SENDING' OR rm.status = 1) AND m.content IS NOT NULL`)
    const data = stmt.get(messageId)
    return data
  }

  findConversationsByMessages(messageIds: any) {
    const sql = `SELECT DISTINCT conversation_id FROM messages WHERE message_id IN (${messageIds
      .map(() => '?')
      .join(',')})`
    return db.prepare(sql).all(messageIds)
  }

  updateMessageStatusById(status: any, messageId: any) {
    return db.prepare('UPDATE messages SET status = ? WHERE message_id = ?').run(status, messageId)
  }

  markMessageRead(messageIds: any) {
    const sql = `UPDATE messages SET status = 'READ' WHERE message_id IN (${messageIds
      .map(() => '?')
      .join(',')}) AND status != 'FAILED'`
    db.prepare(sql).run(messageIds)
  }

  updateMessageContent(content: any, messageId: any) {
    return db
      .prepare(`UPDATE messages SET content = ? WHERE message_id = ? AND category != 'MESSAGE_RECALL'`)
      .run(content, messageId)
  }

  updateMediaStatus(mediaStatus: any, messageId: any) {
    return db
      .prepare(`UPDATE messages SET media_status = ? WHERE message_id = ? AND category != 'MESSAGE_RECALL'`)
      .run(mediaStatus, messageId)
  }

  getConversationIdById(messageId: any) {
    const message = db.prepare('SELECT conversation_id FROM messages WHERE message_id = ?').get(messageId)
    return message.conversation_id
  }

  getMessageById(messageId: any) {
    return db.prepare('SELECT * FROM messages WHERE message_id = ?').get(messageId)
  }

  getMessagesByIds(messageIds: any) {
    return db.prepare(`SELECT * FROM messages WHERE message_id IN (${messageIds.map(() => '?').join(',')})`).all(messageIds)
  }

  recallMessage(messageId: any) {
    db.prepare(
      `UPDATE messages SET category = 'MESSAGE_RECALL', content = NULL, media_url = NULL, media_mime_type = NULL, media_size = NULL,
    media_duration = NULL, media_width = NULL, media_height = NULL, media_hash = NULL, thumb_image = NULL, media_key = NULL,
    media_digest = NUll, media_status = NULL, action = NULL, participant_id = NULL, snapshot_id = NULL, hyperlink = NULL, name = NULL,
    album_id = NULL, sticker_id = NULL, shared_user_id = NULL, media_waveform = NULL, quote_message_id = NULL, quote_content = NULL WHERE message_id = ?`
    ).run(messageId)
  }

  recallMessageAndSend(messageId: any) {
    db.prepare(
      `UPDATE messages SET category = 'MESSAGE_RECALL', content = NULL, media_url = NULL, media_mime_type = NULL, media_size = NULL,
    media_duration = NULL, media_width = NULL, media_height = NULL, media_hash = NULL, thumb_image = NULL, media_key = NULL,
    media_digest = NUll, media_status = NULL, action = NULL, participant_id = NULL, snapshot_id = NULL, hyperlink = NULL, name = NULL,
    album_id = NULL, sticker_id = NULL, shared_user_id = NULL, media_waveform = NULL, quote_message_id = NULL, quote_content = NULL WHERE message_id = ?`
    ).run(messageId)
  }

  findMessageStatusById(messageId: any) {
    const status = db.prepare('SELECT status FROM messages WHERE message_id = ?').get(messageId)
    return status ? status.status : status
  }

  findConversationMediaMessages(conversationId: any) {
    return db.prepare('SELECT * FROM messages WHERE conversation_id = ? AND media_url IS NOT NULL').all(conversationId)
  }

  findSimpleMessageById(messageId: any) {
    return db.prepare('SELECT conversation_id, status FROM messages WHERE message_id = ?').get(messageId)
  }

  takeUnseen(userId: any, conversationId: any) {
    return db
      .prepare(
        `UPDATE conversations SET unseen_message_count =
        (SELECT count(1) FROM messages m WHERE m.conversation_id = '${conversationId}' AND m.status IN ('SENT', 'DELIVERED') AND m.user_id != '${userId}')
        WHERE conversation_id = '${conversationId}'`
      )
      .run()
  }

  findMessageIdById(messageId: any) {
    const message = db.prepare('SELECT message_id FROM messages WHERE message_id = ?').get(messageId)
    return message ? message.message_id : message
  }

  findUnreadMessage(conversationId: any) {
    const userId = this.me().user_id
    return db
      .prepare(
        `SELECT message_id as messageId FROM messages WHERE conversation_id = ? AND status = 'SENT' AND user_id != '${userId}' ORDER BY created_at ASC`
      )
      .all(conversationId)
  }

  getUnreadMessage(conversationId: any) {
    const userId = this.me().user_id
    return db
      .prepare(
        `SELECT message_id FROM messages WHERE conversation_id = ? AND status = 'SENT' AND user_id != '${userId}' ORDER BY created_at ASC`
      )
      .get(conversationId)
  }

  markRead(conversationId: any) {
    const userId = this.me().user_id
    db.prepare(`UPDATE conversations SET unseen_message_count = 0 WHERE conversation_id = ?`).run(conversationId)
    db.prepare(
      `UPDATE messages SET status = 'READ' WHERE conversation_id = ? AND status = 'SENT' AND user_id != '${userId}'`
    ).run(conversationId)
  }

  updateMediaMessage(path: any, status: any, id: any) {
    return db
      .prepare(
        `UPDATE messages SET media_url = ?, media_status = ? WHERE message_id = ? AND category != 'MESSAGE_RECALL'`
      )
      .run([path, status, id])
  }

  findImages(conversationId: any, messageId: any) {
    return db
      .prepare(
        `SELECT m.message_id, m.media_url, m.media_width, m.media_height FROM messages m WHERE m.conversation_id = ?
        AND m.category IN ('SIGNAL_IMAGE', 'PLAIN_IMAGE') AND m.media_status = 'DONE'
        AND m.created_at >= (SELECT created_at FROM messages WHERE message_id = ?) ORDER BY m.created_at ASC`
      )
      .all(conversationId, messageId)
  }

  findMessageItemById(conversationId: any, messageId: any) {
    return db
      .prepare(
        `SELECT m.message_id AS messageId, m.conversation_id AS conversationId, u.user_id AS userId, u.full_name AS userFullName,
        u.identity_number AS userIdentityNumber, u.app_id AS appId, m.category AS type, m.content AS content,
        m.created_at AS createdAt, m.status AS status, m.media_status AS mediaStatus, m.media_waveform AS mediaWaveform,
        m.media_key AS mediaKey, m.media_digest AS mediaDigest, m.name AS mediaName, m.media_mime_type AS mediaMimeType, m.media_size AS mediaSize, m.media_width AS mediaWidth,
        m.media_height AS mediaHeight, m.thumb_image AS thumbImage, m.thumb_url AS thumbUrl, m.media_url AS mediaUrl, m.media_duration AS mediaDuration,
        m.quote_message_id as quoteId, m.quote_content as quoteContent, st.asset_url AS assetUrl, st.asset_width AS assetWidth,
        st.asset_height AS assetHeight, m.sticker_id AS stickerId, st.name AS assetName, st.asset_type AS assetType,
        m.shared_user_id AS sharedUserId, su.full_name AS sharedUserFullName, su.identity_number AS sharedUserIdentityNumber, mm.mentions AS mentions,
        su.avatar_url AS sharedUserAvatarUrl, su.is_verified AS sharedUserIsVerified, su.app_id AS sharedUserAppId
        FROM messages m INNER JOIN users u ON m.user_id = u.user_id LEFT JOIN stickers st ON st.sticker_id = m.sticker_id
        LEFT JOIN users su ON m.shared_user_id = su.user_id
        LEFT JOIN message_mentions mm ON m.message_id = mm.message_id
        WHERE m.conversation_id = ? AND m.message_id = ? AND m.status != 'FAILED'`
      )
      .get([conversationId, messageId])
  }

  updateQuoteContentByQuoteId(conversationId: any, messageId: any, content: any) {
    db.prepare(`UPDATE messages SET quote_content = ? WHERE conversation_id = ? AND quote_message_id = ?`).run([
      content,
      conversationId,
      messageId
    ])
  }
}

export default new MessageDao()
