import crypto from 'crypto'
import Bot from 'bot-api-js-client'
import moment from 'moment'
import store from '@/store/store'
import {
  AvatarColors,
  NameColors
} from '@/utils/constants'
import signalProtocol from '@/crypto/signal'
import md5 from 'md5'
import { ipcRenderer } from 'electron'

export function generateConversationId(userId, recipientId) {
  userId = userId.toString()
  recipientId = recipientId.toString()

  let [minId, maxId] = [userId, recipientId]
  if (minId > maxId) {
    [minId, maxId] = [recipientId, userId]
  }

  const hash = crypto.createHash('md5')
  hash.update(minId)
  hash.update(maxId)
  const bytes = hash.digest()

  bytes[6] = (bytes[6] & 0x0f) | 0x30
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const digest = Array.from(bytes, byte => `0${(byte & 0xff).toString(16)}`.slice(-2)).join('')
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(
    20,
    32
  )}`
}

export function getToken(method, uri, data) {
  const privateKey = localStorage.getItem('sessionToken')
  const account = JSON.parse(localStorage.getItem('account'))
  let token = ''
  if (typeof data === 'object') {
    data = JSON.stringify(data)
  } else {
    data = ''
  }
  if (account && privateKey) {
    const uid = account.user_id
    const sid = account.session_id
    const m = method.toUpperCase()
    const scp =
      'PROFILE:READ PROFILE:WRITE PHONE:READ PHONE:WRITE CONTACTS:READ CONTACTS:WRITE MESSAGES:READ MESSAGES:WRITE ASSETS:READ'
    token = new Bot().signAuthenticationToken(uid, sid, privateKey, m, uri, data, scp)
  }
  return token
}

export function hexToBytes(hex) {
  const bytes = []
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16))
  }
  return bytes
}

export const readArrayBuffer = data => {
  const temporaryFileReader = new FileReader()
  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort()
      reject(new DOMException('Problem parsing input data.'))
    }

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result)
    }
    temporaryFileReader.readAsArrayBuffer(data)
  })
}

export function base64ToUint8Array(base64) {
  const binaryString = window.atob(base64)
  const len = binaryString.length
  let bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export function sendNotification(title, body, conversation) {
  let newNotification = new Notification(title, {
    body: body
  })
  newNotification.onclick = () => {
    store.dispatch('setCurrentConversation', conversation)
    ipcRenderer.send('showWin')
  }
}

export function getAvatarColorById(id) {
  return AvatarColors[Math.abs(uuidHashCode(id)) % AvatarColors.length]
}

export function getNameColorById(id) {
  return NameColors[Math.abs(uuidHashCode(id)) % NameColors.length]
}

function uuidHashCode(name) {
  let components = name.split('-')
  if (components.length !== 5) { return 0 }
  let mostSigBits = `${components[0]}${components[1]}${components[2]}`
  let leastSigBits = `${components[3]}${components[4]}`
  let hilo = bytesToHex(bytesXor(hexToBytes64(mostSigBits), hexToBytes64(leastSigBits)))
  let p1 = hexToBytes(hilo.substr(0, 8))
  let p2 = hexToBytes(hilo.substr(8, 16))
  return parseInt(bytesToHex(bytesXor(p1, p2)), 16)
}

function bytesToHex(bytes) {
  for (var hex = [], i = 0; i < bytes.length; i++) {
    var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i]
    hex.push((current >>> 4).toString(16))
    hex.push((current & 0xF).toString(16))
  }
  return hex.join('')
}

function hexToBytes64(hex) {
  const bytes = []
  for (let c = 0; c < 16; c += 2) {
    if (c < hex.length) {
      bytes.push(parseInt(hex.substr(c, 2), 16))
    } else {
      bytes.push(0)
    }
  }
  return bytes
}

function bytesXor(a, b) {
  const r = []
  for (let c = 0; c < a.length; c++) {
    r[c] = a[c] ^ b[c]
  }
  return r
}

export function convertRemToPixels(rem) {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export function generateConversationChecksum(sessions) {
  const sorted = sessions.map(session => {
    return session.session_id
  }).sort()
  const d = sorted.join('')
  return md5(d)
}
