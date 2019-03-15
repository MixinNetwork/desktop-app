import signalDb from '@/persistence/signal_db'
import mixinDb from '@/persistence/db'

class SignalDao {
  getIdentityKeyPair() {
    const stmt = signalDb.prepare('SELECT * FROM identities WHERE address = -1')
    const identity = stmt.get()
    return identity
  }
  getIdentityKey(name) {
    const stmt = signalDb.prepare('SELECT * FROM identities WHERE address = ?')
    const identity = stmt.get(name)
    return identity
  }
  saveIdentityKey(name, pub) {
    const stmt = signalDb.prepare(
      'INSERT OR REPLACE INTO identities (address, public_key) VALUES (@address, @public_key)'
    )
    stmt.run({
      address: name,
      public_key: pub
    })
  }
  loadSenderKey(groupId, senderId) {
    const stmt = signalDb.prepare('SELECT * FROM sender_keys WHERE group_id = ? AND sender_id = ?')
    const result = stmt.get(groupId, senderId)
    return result
  }
  getSession(recipientId, deviceId) {
    const stmt = signalDb.prepare('SELECT record FROM sessions WHERE address = ? AND device = ?')
    const result = stmt.get(recipientId, deviceId)
    return result
  }
  saveSession(name, deviceId, record) {
    const stmt = signalDb.prepare('SELECT record FROM sessions WHERE address = ? AND device = ?')
    const result = stmt.get(name, deviceId)
    if (result && deviceId === 1) {
      const deleteStmt = mixinDb.prepare(
        'DELETE FROM sent_session_sender_keys WHERE user_id = ? AND session_id = (SELECT session_id FROM sessions WHERE user_id = ? AND device_id = ?)'
      )
      deleteStmt.run(name, name, deviceId)
    }
    const insertStmt = signalDb.prepare(
      'INSERT OR REPLACE INTO sessions (address, device, record) VALUES (@address, @device, @record)'
    )
    insertStmt.run({
      address: name,
      device: deviceId,
      record: record
    })
  }
  deleteSession(name, deviceId) {
    const stmt = signalDb.prepare('DELETE FROM sessions WHERE address = ? AND device = ?')
    stmt.run(name, deviceId)
  }
  getPreKey(preKeyId) {
    const stmt = signalDb.prepare('SELECT record FROM prekeys where prekey_id = ?')
    const result = stmt.get(preKeyId)
    return result
  }
  savePreKey(preKeyId, record) {
    const stmt = signalDb.prepare('INSERT OR REPLACE INTO prekeys (prekey_id, record) VALUES (@preKeyId, @record)')
    stmt.run({
      preKeyId: preKeyId,
      record: record
    })
  }
  deletePreKey(preKeyId) {
    const stmt = signalDb.prepare('DELETE FROM prekeys WHERE prekey_id = ?')
    stmt.run(preKeyId)
  }
  getSignedPreKey(preKeyId) {
    const stmt = signalDb.prepare('SELECT record FROM signed_prekeys where prekey_id = ?')
    const result = stmt.get(preKeyId)
    return result
  }
  getAllSignedPreKeys() {
    const stmt = signalDb.prepare('SELECT record FROM signed_prekeys')
    const result = stmt.all()
    return result
  }
  saveSignedPreKey(preKeyId, record) {
    const stmt = signalDb.prepare(
      'INSERT OR REPLACE INTO signed_prekeys (prekey_id, record) VALUES (@preKeyId, @record)'
    )
    stmt.run({
      preKeyId: preKeyId,
      record: record
    })
  }
  deleteSignedPreKey(signedPreKeyId) {
    const stmt = signalDb.prepare('DELETE FROM signed_prekeys WHERE prekey_id = ?')
    stmt.run(signedPreKeyId)
  }

  saveSenderKey(groupId, senderId, record) {
    const stmt = signalDb.prepare(
      'INSERT OR REPLACE INTO sender_keys(group_id, sender_id, record) VALUES (@groupId, @senderId, @record)'
    )
    stmt.run({
      groupId: groupId,
      senderId: senderId,
      record: record
    })
  }
  getSenderKey(group, senderId) {
    const stmt = signalDb.prepare('SELECT record FROM sender_keys WHERE group_id = ? AND sender_id = ?')
    const result = stmt.get(group, senderId)
    return result
  }
  removeSenderKey(group, senderId) {
    const stmt = signalDb.prepare('DELETE FROM sender_keys WHERE group_id = ? AND sender_id = ?')
    return stmt.run(group, senderId)
  }
}
const signalDao = new SignalDao()
window.global.signalDao = signalDao
export default signalDao
