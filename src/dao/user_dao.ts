import db from '@/persistence/db'
import appDao from './app_dao'

class UserDao {
  insertUser(user: any) {
    if (user.app) {
      user.app_id = user.app.app_id
    } else {
      user.app_id = null
    }
    user.is_verified = user.is_verified ? 1 : 0
    user.is_scam = user.is_scam ? 1 : 0
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO users (user_id, full_name, identity_number, avatar_url, biography, relationship, app_id, mute_until, is_verified, is_scam, created_at) VALUES ' +
        '(@user_id, @full_name, @identity_number, @avatar_url, @biography, @relationship, @app_id, @mute_until, @is_verified, @is_scam, @created_at)'
    )
    const info = stmt.run(user)
    if (info.changes >= 1) {
      return true
    }
    return false
  }
  insertUsers(users: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO users (user_id, full_name, identity_number, avatar_url, biography, relationship, app_id, mute_until, is_verified, is_scam, created_at) VALUES ' +
        '(@user_id, @full_name, @identity_number, @avatar_url, @biography, @relationship, @app_id, @mute_until, @is_verified, @is_scam, @created_at)'
    )
    const insertMany = db.transaction((users: any) => {
      for (let user of users) {
        if (user.app) {
          user.app_id = user.app.app_id
          appDao.insert(user.app)
        } else {
          user.app_id = null
        }
        user.is_verified = user.is_verified ? 1 : 0
        user.is_scam = user.is_scam ? 1 : 0
        stmt.run(user)
      }
    })
    insertMany(users)
  }
  findFriends() {
    return db.prepare("SELECT * FROM users WHERE relationship = 'FRIEND' ORDER BY full_name, user_id ASC").all()
  }
  isMe(userId: any) {
    let me = db.prepare("SELECT * FROM users WHERE relationship='ME'").get()
    if (me && me.user_id === userId) {
      return true
    } else {
      return false
    }
  }
  findUserByConversationId(conversationId: any) {
    return db
      .prepare('SELECT u.* FROM users u, conversations c WHERE c.owner_id = u.user_id AND c.conversation_id = ?')
      .get(conversationId)
  }
  fuzzySearchUser(keyword: string) {
    keyword = keyword.replace(/'/g, '')
    return db
      .prepare(
        `SELECT * FROM users WHERE relationship = 'FRIEND' AND (full_name LIKE '%${keyword}%' OR identity_number LIKE '%${keyword}%')`
      )
      .all()
  }
  findUserByIdentityNumber(id: any) {
    return db.prepare('SELECT * FROM users WHERE identity_number = ?').get(id)
  }
  findUserById(userId: any) {
    return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId)
  }
  updateMute(muteUntil: any, userId: any) {
    return db.prepare('UPDATE users SET mute_until = ? WHERE user_id = ?').run(muteUntil, userId)
  }
  update(u: any) {
    db.prepare(
      `UPDATE users SET relationship = '${u.relationship}', mute_until = '${u.mute_until}', is_verified = ${u.is_verified}, is_scam = ${u.is_scam}, full_name = '${u.full_name}' WHERE user_id = '${u.user_id}'`
    ).run()
  }
  findUserIdByAppNumber(conversationId: string, botNumber: string) {
    return db.prepare(
      `SELECT u.user_id FROM users u INNER JOIN participants p ON p.user_id = u.user_id WHERE p.conversation_id = ? AND u.identity_number = ?`
    ).get(conversationId, botNumber)
  }
  findUsersByIdentityNumber(uid: any) {
    const sql = `SELECT * FROM users WHERE identity_number IN (${uid.map(() => '?').join(',')})`
    return db.prepare(sql).all(uid)
  }
}

export default new UserDao()
