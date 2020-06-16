/* eslint-disable no-undef */
import signalDb from '@/persistence/signal_db'
import signalDao from './signal_dao'
import {hexToBytes} from '@/utils/util'

class SignalProtocol {
  createKeyPair(privKey) {
    const kp = createKeyPairFromGo(privKey)
    return kp
  }
  generateRegId() {
    const regId = generateRegIdFromGo()
    return regId
  }
  generatePreKeys() {
    const begin = localStorage.next_pre_key_id ? parseInt(localStorage.next_pre_key_id) : 1
    const end = begin + 500
    const preKeysStr = generatePreKeysFromGo(begin, end)
    localStorage.next_pre_key_id = end + 1
    const preKeys = preKeysStr.split(',')
    let rows = []
    for (let i = 0; i < preKeys.length; i++) {
      const preKey = preKeys[i]
      const str = String.fromCharCode.apply(String, hexToBytes(preKey))
      const row = JSON.parse(str)
      rows.push({id: row.ID, record: str})
    }

    const stmt = signalDb.prepare('INSERT OR REPLACE INTO prekeys (prekey_id, record) VALUES (@id, @record)')
    const insertMany = signalDb.transaction(records => {
      for (const record of records) {
        stmt.run(record)
      }
    })
    insertMany(rows)
    return rows
  }

  generateSignedPreKey() {
    const keyId = localStorage.pref_next_signed_pre_key_id ? parseInt(localStorage.pref_next_signed_pre_key_id) : 1
    const identityKeyPair = signalDao.getIdentityKeyPair()
    const pub = identityKeyPair.public_key
    const priv = identityKeyPair.private_key
    const result = generateSignedPreKeyFromGo(pub, priv, keyId)
    localStorage.pref_next_signed_pre_key_id = keyId + 1

    const signed = JSON.parse(result)
    const stmt = signalDb.prepare('INSERT OR REPLACE INTO signed_prekeys (prekey_id, record) VALUES (@id, @record)')
    stmt.run({id: signed.ID, record: result})
    return signed
  }

  storeIdentityKeyPair(registrationId, publicKey, privateKey) {
    const stmt = signalDb.prepare(
      'INSERT OR REPLACE INTO identities (address, registration_id, public_key, private_key) VALUES (@address, @registration_id, @public_key, @private_key)'
    )
    const info = stmt.run({
      address: '-1',
      registration_id: registrationId,
      public_key: publicKey,
      private_key: privateKey
    })
    if (info.changes >= 1) {
      return true
    }
    return false
  }

  clearSenderKey(groupId, senderId, deviceId) {
    signalDao.removeSenderKey(groupId, senderId + ':' + deviceId)
  }

  convertToDeviceId(sessionId) {
    const deviceId = uuidHashCodeFromGo(sessionId)
    return deviceId
  }
  isExistSenderKey(groupId, senderId, deviceId) {
    const result = isExistSenderKeyFromGo(groupId, senderId, deviceId)
    return result
  }
  containsSession(recipientId, deviceId) {
    const result = containsSessionFromGo(recipientId, deviceId)
    return result
  }
  containsUserSession(recipientId) {
    const result = signalDao.getUserSession(recipientId)
    return result && result.length > 0
  }
  processSession(recipientId, deviceId, bundle) {
    return processSessionFromGo(recipientId, deviceId, bundle)
  }
  encryptSenderKey(groupId, recipientId, recipientDeviceId, senderId, senderDeviceId) {
    return encryptSenderKeyFromGo(groupId, recipientId, recipientDeviceId, senderId, senderDeviceId)
  }
  encryptGroupMessage(groupId, senderId, senderDeviceId, plaintext) {
    return encryptGroupMessageFromGo(groupId, senderId, senderDeviceId, plaintext)
  }
  encryptSessionMessage(recipientId, deviceId, plaintext, messageId) {
    return encryptSessionMessageFromGo(recipientId, deviceId, plaintext, messageId)
  }
  decryptMessage(groupId, senderId, deviceId, data, category) {
    return decryptEncodedMessageFromGo(groupId, senderId, deviceId, data, category)
  }
  generateKeyPair() {
    return generateKeyPairFromGo()
  }
  decryptProvision(priv, content) {
    return decryptProvisionFromGo(priv, content)
  }
  decryptAttachment(filePath) {
    // TODO
    return decryptAttachmentFromGo(filePath)
  }
}

export default new SignalProtocol()
