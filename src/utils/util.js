import crypto from 'crypto'
import fs from 'fs'
import Bot from 'bot-api-js-client'
import store from '@/store/store'
import { AvatarColors, NameColors, CircleConfig } from '@/utils/constants'
import md5 from 'md5'
import { ipcRenderer } from 'electron'

export function getIdentityNumber(direct) {
  let identityNumber = ''
  const user = getAccount()
  identityNumber = user.identity_number
  if (direct) {
    return identityNumber
  }
  if (identityNumber && !localStorage.newUserDirExist) {
    return ''
  }
  return identityNumber
}

function dirSizeAction(path, dirsMap) {
  let size = 0
  if (fs.existsSync(path)) {
    const files = fs.readdirSync(path)
    files.forEach(file => {
      let curPath = path + '/' + file
      const fileItem = fs.statSync(curPath)
      if (fileItem.isDirectory()) {
        size += dirSizeAction(curPath, dirsMap)
      } else {
        size += fileItem.size / 1024 / 1024
      }
    })
  }
  dirsMap[path] = size
  return size
}

export function dirSize(path) {
  const dirsMap = []
  dirSizeAction(path, dirsMap)
  return dirsMap
}

export function delMedia(messages) {
  messages.forEach(msg => {
    if (msg) {
      const path = msg.path || (msg.media_url && msg.media_url.split('file://')[1])
      if (path && fs.existsSync(path)) {
        fs.unlinkSync(path)
      }
    }
  })
}

export function delMediaMessages(messagesSrc) {
  const messages = []
  messagesSrc.forEach(msg => {
    messages.push({
      path: msg.path || (msg.media_url && msg.media_url.split('file://')[1]),
      mid: msg.mid || msg.message_id,
      cid: msg.cid
    })
  })
  if (messages.length > 0) {
    ipcRenderer.send('taskRequest', { action: 'delMedia', messages })
  }
}

export function getVideoPlayerStatus(player) {
  const paused = player.paused()
  const muted = player.muted()
  const volume = player.volume()
  const currentTime = player.currentTime()
  const playbackRate = player.playbackRate()
  return { paused, muted, volume, currentTime, playbackRate }
}

export function setVideoPlayerStatus(player, status) {
  const { paused, muted, volume, currentTime, playbackRate } = status
  if (paused) {
    player.pause()
  }
  player.muted(muted)
  player.volume(volume)
  player.currentTime(currentTime)
  player.playbackRate(playbackRate)
}

export function listFilePath(path) {
  const list = []
  if (fs.existsSync(path)) {
    const files = fs.readdirSync(path)
    files.forEach(file => {
      let curPath = path + '/' + file
      list.push(curPath)
    })
  }
  return list
}

export function generateConversationId(userId, recipientId) {
  userId = userId.toString()
  recipientId = recipientId.toString()

  let [minId, maxId] = [userId, recipientId]
  if (minId > maxId) {
    ;[minId, maxId] = [recipientId, userId]
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

export function safeParse(data) {
  let res = {}
  if (typeof data === 'string') {
    try {
      res = JSON.parse(data)
    } catch (error) {}
  }
  return res
}

export function getAccount() {
  return safeParse(localStorage.account)
}

export function updateAccount(user) {
  const account = safeParse(localStorage.account)
  account.full_name = user.full_name
  account.biography = user.biography
  localStorage.account = JSON.stringify(account)
}

export function getToken(method, uri, data) {
  const privateKey = localStorage.sessionToken
  const account = safeParse(localStorage.account)
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

export function keyToHump(name) {
  return name.replace(/_(\w)/g, function(all, letter) {
    return letter.toUpperCase()
  })
}

export function keyToLine(name) {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase()
}

export function sendNotification(title, body, conversation) {
  let notificationSetting = {}
  try {
    notificationSetting = JSON.parse(localStorage.notificationSetting || '{}')
  } catch (error) {}
  if (!notificationSetting.hideNotification) {
    let newNotification = new Notification(title, {
      body: body
    })
    newNotification.onclick = () => {
      if (store.state.currentConversationId !== conversation.conversationId) {
        store.dispatch('setCurrentConversation', conversation)
      }
      ipcRenderer.send('showWin')
    }
  }
}

function uuidHashCode(sessionId) {
  if (!sessionId) return ''
  let components = sessionId.split('-')
  components = components.map(item => '0x' + item)
  let mostSigBits = BigInt(components[0])
  mostSigBits <<= 16n
  mostSigBits = BigInt.asIntN(64, mostSigBits)
  let c1 = BigInt(components[1])
  mostSigBits |= c1
  mostSigBits <<= 16n
  mostSigBits = BigInt.asIntN(64, mostSigBits)
  let c2 = BigInt(components[2])
  mostSigBits |= c2
  let leastSigBits = BigInt(components[3])
  leastSigBits <<= 48n
  leastSigBits = BigInt.asIntN(64, leastSigBits)
  let c4 = BigInt(components[4])
  leastSigBits |= c4
  let hilo = mostSigBits ^ leastSigBits
  hilo = BigInt.asIntN(64, hilo)
  let m = BigInt.asIntN(32, hilo >> 32n)
  let n = BigInt.asIntN(32, hilo)
  let result = Number(m ^ n)
  return Math.abs(result)
}

export function getAvatarColorById(id) {
  return AvatarColors[uuidHashCode(id) % AvatarColors.length]
}

export function getNameColorById(id) {
  return NameColors[uuidHashCode(id) % NameColors.length]
}

export function getCircleColorById(id) {
  const colors = CircleConfig.CIRCLE_COLORS
  return colors[uuidHashCode(id) % colors.length]
}

export function convertRemToPixels(rem) {
  return rem * parseFloat(getComputedStyle(document.body).fontSize)
}

export function generateConversationChecksum(sessions) {
  const sorted = sessions
    .map(session => {
      return session.session_id
    })
    .sort()
  const d = sorted.join('')
  return md5(d)
}
