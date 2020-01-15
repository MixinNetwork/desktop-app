import db from '@/persistence/db'
import appDao from './app_dao'

class UserDao {
  insertUser(user) {
    if (user.app) {
      user.app_id = user.app.app_id
    } else {
      user.app_id = null
    }
    user.is_verified = user.is_verified ? 1 : 0
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO users (user_id, full_name, identity_number, avatar_url, biography, relationship, app_id, mute_until, is_verified, created_at) VALUES ' +
        '(@user_id, @full_name, @identity_number, @avatar_url, @biography, @relationship, @app_id, @mute_until, @is_verified, @created_at)'
    )
    const info = stmt.run(user)
    if (info.changes >= 1) {
      return true
    }
    return false
  }
  insertUsers(users) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO users (user_id, full_name, identity_number, avatar_url, biography, relationship, app_id, mute_until, is_verified, created_at) VALUES ' +
        '(@user_id, @full_name, @identity_number, @avatar_url, @biography, @relationship, @app_id, @mute_until, @is_verified, @created_at)'
    )
    const insertMany = db.transaction(users => {
      for (let user of users) {
        if (user.app) {
          user.app_id = user.app.app_id
          appDao.insert(user.app)
        } else {
          user.app_id = null
        }
        user.is_verified = user.is_verified ? 1 : 0
        stmt.run(user)
      }
    })
    insertMany(users)
  }
  findFriends() {
    return db.prepare("SELECT * FROM users WHERE relationship = 'FRIEND' ORDER BY full_name, user_id ASC").all()
  }
  isMe(userId) {
    let me = db.prepare("SELECT * FROM users WHERE relationship='ME'").get()
    if (me && me.user_id === userId) {
      return true
    } else {
      return false
    }
  }
  findUserByConversationId(conversationId) {
    return db
      .prepare('SELECT u.* FROM users u, conversations c WHERE c.owner_id = u.user_id AND c.conversation_id = ?')
      .get(conversationId)
  }
  fuzzySearchUser(keyword) {
    return db
      .prepare(
        `SELECT * FROM users WHERE relationship = 'FRIEND' AND (full_name LIKE '%${keyword.replace("'", '')}%' OR identity_number LIKE '%${keyword}%')`
      )
      .all()
  }
  findUserById(userId) {
    return db.prepare('SELECT * FROM users WHERE user_id == ?').get(userId)
  }
  updateMute(muteUntil, userId) {
    return db.prepare('UPDATE users SET mute_until = ? WHERE user_id = ?').run(muteUntil, userId)
  }
  update(u) {
    db.prepare(
      `UPDATE users SET relationship = '${u.relationship}', mute_until = '${u.mute_until}', is_verified = ${u.is_verified}, full_name = '${u.full_name}' WHERE user_id = '${u.user_id}'`
    ).run()
  }
}

export default new UserDao()
