import crypto from 'crypto'
import fs from 'fs'
import Bot from 'bot-api-js-client'
import store from '@/store/store'
import {
  AvatarColors,
  NameColors,
  CircleConfig
} from '@/utils/constants'
import signalProtocol from '@/crypto/signal'
import md5 from 'md5'
import { ipcRenderer } from 'electron'

export function getIdentityNumber(direct) {
  let identityNumber = ''
  if (localStorage.account) {
    const user = JSON.parse(localStorage.account)
    identityNumber = user.identity_number
  }
  if (direct) {
    return identityNumber
  }
  if (identityNumber && !localStorage.newUserDirExist) {
    return ''
  }
  return identityNumber
}

export function dirSize(path) {
  let size = 0
  if (fs.existsSync(path)) {
    const files = fs.readdirSync(path)
    files.forEach(file => {
      let curPath = path + '/' + file
      const fileItem = fs.statSync(curPath)
      if (fileItem.isDirectory()) {
        size += dirSize(curPath)
      } else {
        size += fileItem.size / 1024 / 1024
      }
    })
  }
  return size
}

export function delMedia(messages) {
  messages.forEach(message => {
    if (!message.media_url) return
    const path = message.media_url.split('file://')[1]
    if (path && fs.existsSync(path)) {
      fs.unlinkSync(path)
    }
  })
}

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
      'PROFILE:READ PROFILE:WRITE PHONE:READ PHONE:WRITE CONTACTS:READ CONTACTS:WRITE MESSAGES:READ MESSAGES:WRITE ASSETS:READ SNAPSHOTS:READ CIRCLES:READ CIRCLES:WRITE'
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
  return AvatarColors[Math.abs(signalProtocol.convertToDeviceId(id)) % AvatarColors.length]
}

export function getNameColorById(id) {
  return NameColors[Math.abs(signalProtocol.convertToDeviceId(id)) % NameColors.length]
}

export function getCircleColorById(id) {
  const colors = CircleConfig.CIRCLE_COLORS
  return colors[Math.abs(signalProtocol.convertToDeviceId(id)) % colors.length]
}

export function convertRemToPixels(rem) {
  return rem * parseFloat(getComputedStyle(document.body).fontSize)
}

export function generateConversationChecksum(sessions) {
  const sorted = sessions.map(session => {
    return session.session_id
  }).sort()
  const d = sorted.join('')
  return md5(d)
}
