import moment from 'moment'
import uuidv4 from 'uuid/v4'
import db from '@/persistence/db'
import { PerPageMessageCount } from '@/utils/constants.js'

class MessageDao {
  me() {
    return JSON.parse(localStorage.getItem('account'))
  }
  insertTextMessage(message) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO messages(message_id,conversation_id,user_id,category,content,status,created_at) VALUES (?,?,?,?,?,?,?)'
    )
    const senderId = this.me().user_id
    const createdAt = new Date().toISOString()
    stmt.run([
      uuidv4().toLowerCase(),
      message.conversationId,
      senderId,
      message.category,
      message.content,
      message.status,
      createdAt
    ])
  }
  insertRelyMessage(message, quoteMessageId, quoteContent) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO messages(message_id,conversation_id,user_id,category,content,status,created_at,quote_message_id,quote_content) VALUES (?,?,?,?,?,?,?,?,?)'
    )
    const senderId = this.me().user_id
    const createdAt = new Date().toISOString()
    stmt.run([
      uuidv4().toLowerCase(),
      message.conversationId,
      senderId,
      message.category,
      message.content,
      message.status,
      createdAt,
      quoteMessageId,
      quoteContent
    ])
  }
  insertMessage(message) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO messages VALUES (@message_id, @conversation_id, @user_id, @category, @content, @media_url, @media_mime_type, @media_size, @media_duration, @media_width, @media_height, @media_hash, @thumb_image, @media_key, @media_digest, @media_status, @status, @created_at, @action, @participant_id, @snapshot_id, @hyperlink, @name, @album_id, @sticker_id, @shared_user_id, @media_waveform, @quote_message_id, @quote_content, @thumb_url)'
    )
    stmt.run(message)
  }

  deleteMessagesById(mIds) {
    const stmt = db.prepare('DELETE FROM messages WHERE message_id = ?')
    const insertMany = db.transaction(mIds => {
      for (let mId of mIds) {
        stmt.run(mId)
      }
    })
    insertMany(mIds)
  }

  ftsMessageLoad(conversationId) {
    db.prepare('DELETE FROM messages_fts WHERE conversation_id = ?').run(conversationId)
    const messages = db
      .prepare(
        'SELECT message_id,conversation_id,m.category As category,m.content As content,m.created_at As created_at,full_name, m.user_id As user_id, avatar_url ' +
          'FROM messages m INNER JOIN users u ON m.user_id = u.user_id WHERE m.conversation_id = ? ORDER BY created_at ASC'
      )
      .all(conversationId)
    const insert = db.prepare(
      'INSERT OR REPLACE INTO messages_fts (content, message_id, conversation_id, full_name, user_id, avatar_url, created_at, message_index) ' +
        'VALUES (@content, @message_id, @conversation_id, @full_name, @user_id, @avatar_url, @created_at, @message_index)'
    )
    const insertMany = db.transaction(messages => {
      const mLen = messages.length
      messages.forEach((message, index) => {
        message.message_index = mLen - index - 1
        if (['SIGNAL_TEXT', 'PLAIN_TEXT'].indexOf(message.category) > -1) {
          insert.run(message)
        }
      })
    })
    insertMany(messages)
  }

  ftsMessageQuery(conversationId, keyword) {
    return db
      .prepare(
        `SELECT * from messages_fts WHERE messages_fts.conversation_id = ? AND content MATCH ? ORDER BY created_at DESC LIMIT 100`
      )
      .all(conversationId, `${keyword}*`)
  }

  getMessages(conversationId, page = 0, tempCount = 0) {
    const perPageCount = PerPageMessageCount
    const offset = page * perPageCount + tempCount
    const stmt = db.prepare(
      'SELECT * FROM (SELECT m.message_id AS messageId, m.conversation_id AS conversationId, u.user_id AS userId, ' +
        'u.full_name AS userFullName, u.identity_number AS userIdentityNumber, u.app_id AS appId, m.category AS type, ' +
        'm.content AS content, m.created_at AS createdAt, m.status AS status, m.media_status AS mediaStatus, m.media_waveform AS mediaWaveform, ' +
        'm.name AS mediaName, m.media_mime_type AS mediaMimeType, m.media_size AS mediaSize, m.media_width AS mediaWidth, m.media_height AS mediaHeight, ' +
        'm.thumb_image AS thumbImage, m.thumb_url AS thumbUrl, m.media_url AS mediaUrl, m.media_duration AS mediaDuration, m.quote_message_id as quoteId, m.quote_content as quoteContent, ' +
        'u1.full_name AS participantFullName, m.action AS actionName, u1.user_id AS participantUserId, ' +
        's.snapshot_id AS snapshotId, s.type AS snapshotType, s.amount AS snapshotAmount, a.symbol AS assetSymbol, a.asset_id AS assetId, ' +
        'a.icon_url AS assetIcon, st.asset_url AS assetUrl, st.asset_width AS assetWidth, st.asset_height AS assetHeight, st.sticker_id AS stickerId, ' +
        'st.name AS assetName, st.asset_type AS assetType, h.site_name AS siteName, h.site_title AS siteTitle, h.site_description AS siteDescription, ' +
        'h.site_image AS siteImage, m.shared_user_id AS sharedUserId, su.full_name AS sharedUserFullName, su.identity_number AS sharedUserIdentityNumber, ' +
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
        'WHERE m.conversation_id = ? ' +
        'ORDER BY m.created_at DESC LIMIT ' +
        perPageCount +
        ' OFFSET ?) ORDER BY createdAt ASC'
    )
    let data = stmt.all(conversationId, offset)
    data.forEach(function(e) {
      e.lt = moment(e.createdAt).format('HH:mm')
    })
    return data
  }
  getMessagesCount(conversationId) {
    return db.prepare('SELECT count(m.message_id) FROM messages m WHERE m.conversation_id = ?').get(conversationId)
  }
  getSendingMessages() {
    const stmt = db.prepare(`
      SELECT m.message_id, m.conversation_id, m.user_id, m.category, m.content, m.media_url, m.media_mime_type,
      m.media_size, m.media_duration, m.media_width, m.media_height, m.media_hash, m.thumb_image, m.media_key,
      m.media_digest, m.media_status, m.status, m.created_at, m.action, m.participant_id, m.snapshot_id, m.hyperlink,
      m.name, m.album_id, m.sticker_id, m.shared_user_id, m.media_waveform, m.quote_message_id, m.quote_content,
      rm.status as resend_status, rm.user_id as resend_user_id, rm.session_id as resend_session_id
      FROM messages m LEFT JOIN resend_session_messages rm on m.message_id = rm.message_id
      WHERE (m.status = 'SENDING' OR rm.status = 1) AND m.content IS NOT NULL ORDER BY m.created_at ASC LIMIT 1`)
    const data = stmt.get()
    return data
  }
  updateMessageStatusById(status, messageId) {
    return db.prepare('UPDATE messages SET status = ? WHERE message_id = ?').run(status, messageId)
  }
  updateMessageContent(content, messageId) {
    return db
      .prepare('UPDATE messages SET content = ? WHERE message_id = ? AND category != "MESSAGE_RECALL"')
      .run(content, messageId)
  }

  updateMediaStatus(mediaStatus, messageId) {
    return db
      .prepare('UPDATE messages SET media_status = ? WHERE message_id = ? AND category != "MESSAGE_RECALL"')
      .run(mediaStatus, messageId)
  }

  getConversationIdById(messageId) {
    const message = db.prepare('SELECT conversation_id FROM messages WHERE message_id = ?').get(messageId)
    return message.conversation_id
  }
  getMessageById(messageId) {
    return db.prepare('SELECT * FROM messages WHERE message_id = ?').get(messageId)
  }

  recallMessage(messageId) {
    db.prepare(
      `UPDATE messages SET category = 'MESSAGE_RECALL', content = NULL, media_url = NULL, media_mime_type = NULL, media_size = NULL,
    media_duration = NULL, media_width = NULL, media_height = NULL, media_hash = NULL, thumb_image = NULL, media_key = NULL,
    media_digest = NUll, media_status = NULL, action = NULL, participant_id = NULL, snapshot_id = NULL, hyperlink = NULL, name = NULL,
    album_id = NULL, sticker_id = NULL, shared_user_id = NULL, media_waveform = NULL, quote_message_id = NULL, quote_content = NULL WHERE message_id = ?`
    ).run(messageId)
  }

  recallMessageAndSend(messageId) {
    db.prepare(
      `UPDATE messages SET category = 'MESSAGE_RECALL', content = NULL, media_url = NULL, media_mime_type = NULL, media_size = NULL,
    media_duration = NULL, media_width = NULL, media_height = NULL, media_hash = NULL, thumb_image = NULL, media_key = NULL,
    media_digest = NUll, media_status = NULL, action = NULL, participant_id = NULL, snapshot_id = NULL, hyperlink = NULL, name = NULL,
    album_id = NULL, sticker_id = NULL, shared_user_id = NULL, media_waveform = NULL, quote_message_id = NULL, quote_content = NULL WHERE message_id = ?`
    ).run(messageId)
  }

  findMessageStatusById(messageId) {
    const status = db.prepare('SELECT status FROM messages WHERE message_id = ?').get(messageId)
    return status ? status.status : status
  }
  findMessageIdById(messageId) {
    const message = db.prepare('SELECT message_id FROM messages WHERE message_id = ?').get(messageId)
    return message ? message.message_id : message
  }
  findUnreadMessage(conversationId) {
    const userId = JSON.parse(localStorage.getItem('account')).user_id
    return db
      .prepare(
        `SELECT message_id FROM messages WHERE conversation_id = ? AND status = "SENT"  AND user_id != '${userId}' ORDER BY created_at ASC`
      )
      .all(conversationId)
  }
  getUnreadMessage(conversationId) {
    const userId = JSON.parse(localStorage.getItem('account')).user_id
    return db
      .prepare(
        `SELECT message_id FROM messages WHERE conversation_id = ? AND status = "SENT"  AND user_id != '${userId}' ORDER BY created_at ASC`
      )
      .get(conversationId)
  }
  markRead(conversationId) {
    const userId = JSON.parse(localStorage.getItem('account')).user_id
    db.prepare(
      `UPDATE messages SET status = 'READ' WHERE conversation_id = ? AND user_id != '${userId}' AND status = 'SENT'`
    ).run(conversationId)
  }
  updateMediaMessage(path, status, id) {
    db.prepare(
      `UPDATE messages SET media_url = ?, media_status = ? WHERE message_id = ? AND category != "MESSAGE_RECALL"`
    ).run([path, status, id])
  }
  findImages(conversationId, messageId) {
    return db
      .prepare(
        `SELECT m.message_id, m.media_url, m.media_width, m.media_height FROM messages m WHERE m.conversation_id = ? and (m.category = 'SIGNAL_IMAGE' OR m.category = 'PLAIN_IMAGE') AND m.media_status = 'DONE'
        AND m.created_at <= (SELECT created_at FROM messages WHERE message_id = ?) ORDER BY m.created_at DESC LIMIT 10`
      )
      .all(conversationId, messageId)
  }
  findMessageItemById(conversationId, messageId) {
    return db
      .prepare(
        `SELECT m.message_id AS messageId, m.conversation_id AS conversationId, u.user_id AS userId, u.full_name AS userFullName,
        u.identity_number AS userIdentityNumber, u.app_id AS appId, m.category AS type, m.content AS content,
        m.created_at AS createdAt, m.status AS status, m.media_status AS mediaStatus, m.media_waveform AS mediaWaveform,
        m.name AS mediaName, m.media_mime_type AS mediaMimeType, m.media_size AS mediaSize, m.media_width AS mediaWidth,
        m.media_height AS mediaHeight, m.thumb_image AS thumbImage, m.thumb_url AS thumbUrl, m.media_url AS mediaUrl, m.media_duration AS mediaDuration,
        m.quote_message_id as quoteId, m.quote_content as quoteContent, st.asset_url AS assetUrl, st.asset_width AS assetWidth,
        st.asset_height AS assetHeight, st.sticker_id AS stickerId, st.name AS assetName, st.asset_type AS assetType,
        m.shared_user_id AS sharedUserId, su.full_name AS sharedUserFullName, su.identity_number AS sharedUserIdentityNumber,
        su.avatar_url AS sharedUserAvatarUrl, su.is_verified AS sharedUserIsVerified, su.app_id AS sharedUserAppId
        FROM messages m INNER JOIN users u ON m.user_id = u.user_id LEFT JOIN stickers st ON st.sticker_id = m.sticker_id
        LEFT JOIN users su ON m.shared_user_id = su.user_id
        WHERE m.conversation_id = ? AND m.message_id = ? AND m.status != 'FAILED'`
      )
      .get([conversationId, messageId])
  }

  updateQuoteContentByQuoteId(conversationId, messageId, content) {
    db.prepare(`UPDATE messages SET quote_content = ? WHERE conversation_id = ? AND quote_message_id = ?`).run([
      content,
      conversationId,
      messageId
    ])
  }
}

export default new MessageDao()
