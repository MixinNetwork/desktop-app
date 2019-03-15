// eslint-disable-next-line no-undef
const { decrypt } = libsignal.crypto
class CryptoAttachment {
  decryptAttachment(encryptedBin, keys, theirDigest) {
    if (keys.byteLength !== 64) {
      throw new Error('Got invalid length attachment keys')
    }
    if (encryptedBin.byteLength < 16 + 32) {
      throw new Error('Got invalid length attachment')
    }

    const aesKey = keys.slice(0, 32)
    const macKey = keys.slice(32, 64)

    const iv = encryptedBin.slice(0, 16)
    const ciphertext = encryptedBin.slice(16, encryptedBin.byteLength - 32)
    const ivAndCiphertext = encryptedBin.slice(0, encryptedBin.byteLength - 32)
    const mac = encryptedBin.slice(encryptedBin.byteLength - 32, encryptedBin.byteLength)

    return this.verifyMAC(ivAndCiphertext, macKey, mac, 32)
      .then(() => {
        if (!theirDigest) {
          throw new Error('Failure: Ask sender to update Signal and resend.')
        }
        return this.verifyDigest(encryptedBin, theirDigest)
      })
      .then(() => decrypt(aesKey, ciphertext, iv))
  }
  verifyDigest(data, theirDigest) {
    return crypto.subtle.digest({ name: 'SHA-256' }, data).then(ourDigest => {
      const a = new Uint8Array(ourDigest)
      const b = new Uint8Array(theirDigest)
      let result = 0
      for (let i = 0; i < theirDigest.byteLength; i += 1) {
        result |= a[i] ^ b[i]
      }
      if (result !== 0) {
        throw new Error('Bad digest')
      }
    })
  }
  verifyMAC(data, key, mac, length) {
    return this.sign(key, data).then(function(calculatedMac) {
      if (mac.byteLength !== length || calculatedMac.byteLength < length) {
        throw new Error('Bad MAC length')
      }
      var a = new Uint8Array(calculatedMac)
      var b = new Uint8Array(mac)
      var result = 0
      for (var i = 0; i < mac.byteLength; ++i) {
        result = result | (a[i] ^ b[i])
      }
      if (result !== 0) {
        throw new Error('Bad MAC')
      }
    })
  }
  sign(key, data) {
    return crypto.subtle
      .importKey('raw', key, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign'])
      .then(function(key) {
        return crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, key, data)
      })
  }
}

export default new CryptoAttachment()
