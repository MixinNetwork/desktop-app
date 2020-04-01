import attachmentApi from '@/api/attachment'
import { remote, nativeImage, ipcRenderer } from 'electron'
import { MimeType } from '@/utils/constants'
// @ts-ignore
import { v4 as uuidv4 } from 'uuid'
// @ts-ignore
import jo from 'jpeg-autorotate'
import fs from 'fs'
import path from 'path'
import sizeOf from 'image-size'
import cryptoAttachment from '@/crypto/crypto_attachment'
import { base64ToUint8Array } from '@/utils/util'
import conversationAPI from '@/api/conversation'
import signalProtocol from '@/crypto/signal'

import { SequentialTaskQueue } from 'sequential-task-queue'
import mediaPath from '@/utils/media_path'

const Database = require('better-sqlite3')
const { getImagePath, getVideoPath, getAudioPath, getDocumentPath, setUserDataPath } = mediaPath
const userDataPath = remote.app.getPath('userData')
setUserDataPath(userDataPath)

export let downloadQueue = new SequentialTaskQueue()

const cancelMap: any = {}
const controllerMap: any = {}

const cancelPromise = (id: string) => {
  cancelMap[id] = false
  return new Promise((resolve, reject) => {
    const action = () => {
      if (cancelMap[id]) {
        cancelMap[id] = false
        resolve(new Response('timeout', { status: 504, statusText: 'timeout ' }))
        controllerMap[id].abort()
      } else {
        setTimeout(() => {
          action()
        }, 100)
      }
    }
    action()
  })
}
const requestPromise = (url: string, id: string, opt: any) => {
  const controller = new AbortController()
  const signal = controller.signal
  controllerMap[id] = controller
  Object.assign(opt, {
    signal
  })
  return fetch(url, opt)
}

export async function updateCancelMap(id: string) {
  cancelMap[id] = true
}

export function mediaMigration(identityNumber: string) {
  const dbPath = path.join(userDataPath, `${identityNumber}/mixin.db`)
  if (!fs.existsSync(dbPath)) {
    return -1
  }

  const mixinDb = new Database(dbPath, { readonly: false })
  const mediaMessages: any = mixinDb
    .prepare(
      'SELECT category, conversation_id as conversationId, message_id as messageId, media_url as mediaUrl FROM messages WHERE media_url IS NOT NULL'
    )
    .all()

  ipcRenderer.send('workerTask', { action: 'copyFile', data: { mediaMessages, identityNumber, userDataPath, dbPath } })
}

function getIdentityNumber() {
  let identityNumber = ''
  if (localStorage.account) {
    const user = JSON.parse(localStorage.account)
    identityNumber = user.identity_number
  }
  if (identityNumber) {
    const dbPath = path.join(userDataPath, `${identityNumber}/mixin.db`)
    if (!fs.existsSync(dbPath)) {
      identityNumber = ''
    }
  }
  return identityNumber
}

function getMediaNewDir(category: string, identityNumber: string, conversationId: string) {
  let dir = ''
  if (category.endsWith('_IMAGE')) {
    dir = getImagePath(identityNumber, conversationId)
  } else if (category.endsWith('_VIDEO')) {
    dir = getVideoPath(identityNumber, conversationId)
  } else if (category.endsWith('_DATA')) {
    dir = getDocumentPath(identityNumber, conversationId)
  } else if (category.endsWith('_AUDIO')) {
    dir = getAudioPath(identityNumber, conversationId)
  }
  return dir
}

export async function downloadAttachment(message: any) {
  try {
    const { category, content } = message
    const conversationId = message.conversationId || message.conversation_id
    const response = await attachmentApi.getAttachment(content)
    if (response.data.data) {
      const identityNumber = getIdentityNumber()
      let dir = getMediaNewDir(category, identityNumber, conversationId)
      if (!dir) {
        return null
      }
      const m = message
      let filePath = path.join(dir, m.message_id)
      if (!identityNumber) {
        const name = generateName(m.name, m.media_mime_type, m.category, m.message_id)
        filePath = path.join(dir, name)
      }
      if (category.startsWith('SIGNAL_')) {
        const data = await getAttachment(response.data.data.view_url, m.message_id)
        const mediaKey = base64ToUint8Array(m.media_key).buffer
        const mediaDigest = base64ToUint8Array(m.media_digest).buffer
        const resp = await cryptoAttachment.decryptAttachment(data, mediaKey, mediaDigest)
        fs.writeFileSync(filePath, Buffer.from(resp))

        try {
          let { buffer } = await jo.rotate(filePath, {})
          fs.writeFileSync(filePath, buffer)
          return [m, filePath]
        } catch (e) {
          return [m, filePath]
        }
      } else {
        const data: any = await getAttachment(response.data.data.view_url, m.message_id)
        fs.writeFileSync(filePath, Buffer.from(data))
        try {
          let { buffer } = await jo.rotate(filePath, {})
          fs.writeFileSync(filePath, buffer)
          return [m, filePath]
        } catch (e) {
          return [m, filePath]
        }
      }
    }
  } catch (e) {
    return null
  }
}

function processAttachment(imagePath: any, mimeType: string, category: any, id: any, conversationId: any) {
  const fileName = path.parse(imagePath).base
  let destination = ''
  const identityNumber = getIdentityNumber()
  let dir = getMediaNewDir(category, identityNumber, conversationId)
  if (dir) {
    destination = path.join(dir, id)
  }

  if (!identityNumber) {
    let type: string = mimeType
    // @ts-ignore
    if (mimeType && mimeType.length > 0) type = path.parse(imagePath).extension
    destination = path.join(getImagePath(), generateName(fileName, type, category, id))
  }

  fs.copyFileSync(imagePath, destination)
  return { localPath: destination, name: fileName }
}

export async function base64ToImage(img: string, mimeType: any) {
  let data = img.replace(/^data:image\/\w+;base64,/, '')
  let buf = Buffer.from(data, 'base64')
  const destination = path.join(getImagePath(), generateName('', mimeType, '_IMAGE', ''))
  await fs.writeFileSync(destination, buf)
  return { path: destination, type: mimeType }
}

function toArrayBuffer(buf: string | any[] | Buffer) {
  let ab = new ArrayBuffer(buf.length)
  let view = new Uint8Array(ab)
  for (let i = 0; i < buf.length; ++i) {
    view[i] = buf[i]
  }
  return ab
}
function base64Thumbnail(url: string, width: number, height: number) {
  let image = nativeImage.createFromPath(url)
  if (width > height) {
    image = image.resize({ width: 48, height: height / (width / 48), quality: 'good' })
  } else {
    image = image.resize({ width: width / (height / 48), height: 48, quality: 'good' })
  }
  let base64str = image.toPNG().toString('base64')

  return base64str
}

function putHeader(buffer: any) {
  return {
    method: 'PUT',
    body: buffer,
    headers: {
      'x-amz-acl': 'public-read',
      Connection: 'close',
      'Content-Length': buffer.byteLength,
      'Content-Type': 'application/octet-stream'
    }
  }
}

function getRandomBytes(bit: number) {
  // @ts-ignore
  return libsignal.crypto.getRandomBytes(bit)
}

export interface AttachmentMessagePayload {
  mediaUrl?: string
  mediaMimeType: string
  mediaWidth?: number
  mediaHeight?: number
  mediaDuration?: number
  thumbImage?: string
  category: string
  id?: any
  mediaSize?: number
  mediaName?: string
  thumbUrl?: string
  mediaWaveform?: string
  conversationId?: string
}

export async function putAttachment(
  payload: AttachmentMessagePayload,
  processCallback: any,
  sendCallback: any,
  errorCallback: any
) {
  let {
    mediaUrl,
    mediaMimeType,
    mediaName,
    category,
    id,
    mediaWidth = 0,
    mediaHeight = 0,
    thumbImage = '',
    mediaDuration = 0,
    conversationId
  } = payload
  const { localPath, name } = processAttachment(mediaUrl, mediaMimeType, category, id, conversationId)
  if (category.endsWith('_IMAGE')) {
    // @ts-ignore
    const dimensions = sizeOf(localPath)
    mediaWidth = dimensions.width
    mediaHeight = dimensions.height
    thumbImage = base64Thumbnail(localPath, mediaWidth, mediaHeight)
  }
  let buffer = fs.readFileSync(localPath)
  let key: Iterable<number>
  let digest: Iterable<number>
  const message: AttachmentMessagePayload = {
    id,
    category,
    mediaName: mediaName || name,
    mediaSize: buffer.byteLength,
    mediaWidth,
    mediaHeight,
    mediaUrl: `file://${localPath}`,
    mediaMimeType,
    mediaDuration,
    thumbImage
  }
  if (category.startsWith('SIGNAL_')) {
    key = getRandomBytes(64)
    const iv = getRandomBytes(16)
    const buf = toArrayBuffer(buffer)
    await cryptoAttachment.encryptAttachment(buf, key, iv).then((result: { ciphertext: Buffer; digest: any }) => {
      buffer = result.ciphertext
      digest = result.digest
    })
  }
  processCallback(message)
  try {
    const result = await conversationAPI.requestAttachment()
    if (result.status !== 200) {
      errorCallback(`Error ${result.status}`)
      return
    }
    const url = result.data.data.upload_url
    const attachmentId = result.data.data.attachment_id
    const opt = putHeader(buffer)
    Promise.race([cancelPromise(id), requestPromise(url, id, opt)])
      .then(function(resp: any) {
        if (resp.status === 200) {
          sendCallback({
            attachment_id: attachmentId,
            mime_type: mediaMimeType,
            size: buffer.byteLength,
            width: mediaWidth,
            height: mediaHeight,
            duration: mediaDuration,
            name: name,
            thumbnail: thumbImage,
            digest: btoa(String.fromCharCode(...new Uint8Array(digest))),
            key: btoa(String.fromCharCode(...new Uint8Array(key)))
          })
        } else {
          errorCallback(resp.status)
        }
      })
      .catch(error => {
        errorCallback(error)
      })
  } catch (error) {
    errorCallback(error)
  }
}

export async function uploadAttachment(
  messageId: string,
  localPath: string | number | Buffer | import('url').URL,
  category: string,
  sendCallback: any,
  errorCallback: any
) {
  let key: Iterable<number>
  let digest: Iterable<number>
  let buffer = fs.readFileSync(localPath)
  if (category.startsWith('SIGNAL_')) {
    key = getRandomBytes(64)
    const iv = getRandomBytes(16)
    const buf = toArrayBuffer(buffer)
    await cryptoAttachment.encryptAttachment(buf, key, iv).then((result: { ciphertext: Buffer; digest: any }) => {
      buffer = result.ciphertext
      digest = result.digest
    })
  }
  try {
    const result = await conversationAPI.requestAttachment()
    if (result.status !== 200) {
      errorCallback(`Error ${result.status}`)
      return
    }
    const url = result.data.data.upload_url
    const attachmentId = result.data.data.attachment_id
    const opt = putHeader(buffer)
    Promise.race([cancelPromise(messageId), requestPromise(url, messageId, opt)])
      .then(function(resp: any) {
        if (!cancelMap[messageId]) {
          if (resp.status === 200) {
            sendCallback(
              attachmentId,
              btoa(String.fromCharCode(...new Uint8Array(key))),
              btoa(String.fromCharCode(...new Uint8Array(digest)))
            )
          } else {
            errorCallback(resp.status)
          }
        }
      })
      .catch(error => {
        errorCallback(error)
      })
  } catch (error) {
    errorCallback(error)
  }
}

function generateName(fileName: string, mimeType: string, category: string, id: string) {
  const date = new Date()
  if (!id) {
    id = uuidv4()
  }
  const name = `${date.getFullYear()}${date.getMonth()}${date.getDay()}_${date.getHours()}${date.getMinutes()}_${Math.abs(
    signalProtocol.convertToDeviceId(id)
  )}`
  let header
  if (category.endsWith('_IMAGE')) {
    header = 'IMG'
  } else if (category.endsWith('_VIDEO')) {
    header = 'VID'
    return `${header}_${name}.mp4`
  } else if (category.endsWith('_DATA')) {
    header = 'FILE'
  } else if (category.endsWith('_AUDIO')) {
    header = 'AUDIO'
    return `${header}_${name}.ogg`
  }
  let extension
  if (mimeType === MimeType.JPEG.name) {
    extension = MimeType.JPEG.extension
  } else if (mimeType === MimeType.PNG.name) {
    extension = MimeType.PNG.extension
  } else if (mimeType === MimeType.GIF.name) {
    extension = MimeType.GIF.extension
  } else if (mimeType === MimeType.BMP.name) {
    extension = MimeType.BMP.extension
  } else if (mimeType === MimeType.WEBP.name) {
    extension = MimeType.WEBP.extension
  } else {
    let fileArr = fileName.split('.')
    if (fileArr) {
      extension = fileArr.pop()
    }
  }
  if (extension) {
    return `${header}_${name}.${extension}`
  } else {
    return `${header}_${name}`
  }
}

export function isImage(mimeType: string) {
  if (
    mimeType === MimeType.JPEG.name ||
    mimeType === MimeType.JPEG.name ||
    mimeType === MimeType.PNG.name ||
    mimeType === MimeType.GIF.name ||
    mimeType === MimeType.BMP.name ||
    mimeType === MimeType.WEBP.name
  ) {
    return true
  } else {
    return false
  }
}

function parseFile(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = function(event: any) {
      const content = event.target.result
      resolve(content)
    }
    reader.onerror = function(event) {
      reject(event)
    }
    reader.readAsArrayBuffer(blob)
  })
}

function getAttachment(url: string, id: string) {
  return Promise.race([
    cancelPromise(id),
    requestPromise(url, id, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    })
  ])
    .then(function(resp: any) {
      let code: any = parseInt(resp.status)
      if (code !== 200) {
        throw Error(code)
      }
      return resp.blob()
    })
    .then(function(blob) {
      if (!blob) {
        throw Error('Error data')
      }
      return parseFile(blob)
    })
    .catch(error => {
      console.log('getAttachment err:', error)
    })
}
