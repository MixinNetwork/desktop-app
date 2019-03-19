// eslint-disable-next-line no-undef
const { encrypt, decrypt, calculateMAC, verifyMAC } = libsignal.crypto
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

    return verifyMAC(ivAndCiphertext, macKey, mac, 32)
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
  calculateDigest(data) {
    return crypto.subtle.digest({ name: 'SHA-256' }, data)
  }
  sign(key, data) {
    return crypto.subtle
      .importKey('raw', key, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign'])
      .then(function(key) {
        return crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, key, data)
      })
  }
  encryptAttachment(plaintext, keys, iv) {
    if (!(plaintext instanceof ArrayBuffer) && !ArrayBuffer.isView(plaintext)) {
      throw new TypeError(`\`plaintext\` must be an \`ArrayBuffer\` or \`ArrayBufferView\`; got: ${typeof plaintext}`)
    }

    if (keys.byteLength !== 64) {
      throw new Error('Got invalid length attachment keys')
    }
    if (iv.byteLength !== 16) {
      throw new Error('Got invalid length attachment iv')
    }
    const aesKey = keys.slice(0, 32)
    const macKey = keys.slice(32, 64)

    return encrypt(aesKey, plaintext, iv).then(ciphertext => {
      const ivAndCiphertext = new Uint8Array(16 + ciphertext.byteLength)
      ivAndCiphertext.set(new Uint8Array(iv))
      ivAndCiphertext.set(new Uint8Array(ciphertext), 16)

      return calculateMAC(macKey, ivAndCiphertext.buffer).then(mac => {
        const encryptedBin = new Uint8Array(16 + ciphertext.byteLength + 32)
        encryptedBin.set(ivAndCiphertext)
        encryptedBin.set(new Uint8Array(mac), 16 + ciphertext.byteLength)
        return this.calculateDigest(encryptedBin.buffer).then(digest => ({
          ciphertext: encryptedBin.buffer,
          digest
        }))
      })
    })
  }
}

export default new CryptoAttachment()
