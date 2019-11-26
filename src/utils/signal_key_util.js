import signalAPI from '@/api/signal.js'
import signalProtocol from '@/crypto/signal.js'
import signalDao from '@/crypto/signal_dao.js'

async function refresh() {
  const response = await signalAPI.postSignalKeys(generateKeys())
  if (response != null && response.error == null) {
  }
}

export async function checkSignalKey() {
  const response = await signalAPI.getSignalKeyCount()
  if (response != null && response.error == null && response.data != null) {
    const availableKeyCount = response.data.one_time_pre_keys_count
    if (availableKeyCount >= 500) {
      return
    }
    refresh()
  }
}

function generateKeys() {
  const identityKeyPair = signalDao.getIdentityKeyPair()
  const preKeys = signalProtocol.generatePreKeys()
  const signedPreKey = signalProtocol.generateSignedPreKey()
  let otpks = []
  for (let i in preKeys) {
    const p = JSON.parse(preKeys[i].record)
    otpks.push({ key_id: p.ID, pub_key: p.PublicKey })
  }
  const body = {
    identity_key: identityKeyPair.public_key,
    signed_pre_key: {
      key_id: signedPreKey.ID,
      pub_key: signedPreKey.PublicKey,
      signature: signedPreKey.Signature
    },
    one_time_pre_keys: otpks
  }
  return body
}
