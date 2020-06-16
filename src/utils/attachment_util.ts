import attachmentApi from '@/api/attachment'
import { remote, nativeImage } from 'electron'
import { MimeType, messageType } from '@/utils/constants'
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
import stickerApi from '@/api/sticker'
import stickerDao from '@/dao/sticker_dao'

import { SequentialTaskQueue } from 'sequential-task-queue'
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

export async function downloadSticker(stickerId: string) {
  const response = await stickerApi.getStickerById(stickerId)
  if (response.data.data) {
    const resData = response.data.data
    stickerDao.insertUpdate(resData)
    const data: any = await getAttachment(resData.asset_url, stickerId)
    const dir = getStickerPath()
    const filePath = path.join(dir, stickerId)
    fs.writeFileSync(filePath, Buffer.from(data))
    if (filePath) {
      stickerDao.updateStickerUrl('file://' + filePath, stickerId)
    }
    return filePath
  }
}

export async function updateStickerAlbums(albums: any) {
  albums.forEach((item: any) => {
    const url = item.icon_url
    if (!url.startsWith('file://')) {
      getAttachment(url, item.album_id).then((data: any) => {
        const dir = getStickerPath()
        const filePath = path.join(dir, item.album_id)
        fs.writeFileSync(filePath, Buffer.from(data))
        stickerDao.updateAlbumUrl('file://' + filePath, item.album_id)
        item.icon_url = 'file://' + filePath
      })
    }
  })
}

export async function downloadAttachment(message: any) {
  try {
    const response = await attachmentApi.getAttachment(message.content)
    if (response.data.data) {
      let dir
      if (messageType(message.category) === 'image') {
        dir = getImagePath()
      } else if (messageType(message.category) === 'video') {
        dir = getVideoPath()
      } else if (messageType(message.category) === 'file') {
        dir = getDocumentPath()
      } else if (messageType(message.category) === 'audio') {
        dir = getAudioPath()
      } else {
        return null
      }
      if (message.category.startsWith('SIGNAL_')) {
        const m = message
        const data = await getAttachment(response.data.data.view_url, m.message_id)
        const mediaKey = base64ToUint8Array(m.media_key).buffer
        const mediaDigest = base64ToUint8Array(m.media_digest).buffer
        const resp = await cryptoAttachment.decryptAttachment(data, mediaKey, mediaDigest)
        const name = generateName(m.name, m.media_mime_type, m.category, m.message_id)
        const filePath = path.join(dir, name)
        fs.writeFileSync(filePath, Buffer.from(resp))

        try {
          let { buffer } = await jo.rotate(filePath, {})
          fs.writeFileSync(filePath, buffer)
          return [m, filePath]
        } catch (e) {
          return [m, filePath]
        }
      } else {
        const m = message
        const data: any = await getAttachment(response.data.data.view_url, m.message_id)
        const name = generateName(m.name, m.media_mime_type, m.category, m.message_id)
        const filePath = path.join(dir, name)
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

function processAttachment(imagePath: any, mimeType: string, category: any, id: any) {
  const fileName = path.parse(imagePath).base
  let type: string = mimeType
  // @ts-ignore
  if (mimeType && mimeType.length > 0) type = path.parse(imagePath).extension
  const destination = path.join(getImagePath(), generateName(fileName, type, category, id))
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
    image = image.resize({ width: 8, height: height / (width / 8), quality: 'good' })
  } else {
    image = image.resize({ width: width / (height / 8), height: 8, quality: 'good' })
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
    mediaWaveform = ''
  } = payload
  const { localPath, name } = processAttachment(mediaUrl, mediaMimeType, category, id)
  if (messageType(category) === 'image') {
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
    mediaWaveform,
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
            waveform: mediaWaveform,
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
  if (messageType(category) === 'image') {
    header = 'IMG'
  } else if (messageType(category) === 'video') {
    header = 'VID'
    return `${header}_${name}.mp4`
  } else if (messageType(category) === 'file') {
    header = 'FILE'
  } else if (messageType(category) === 'audio') {
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

function getImagePath() {
  const dir = path.join(getMediaPath(), 'Image')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}

function getStickerPath() {
  const dir = path.join(getMediaPath(), 'Sticker')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}

function getVideoPath() {
  const dir = path.join(getMediaPath(), 'Video')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}

function getAudioPath() {
  const dir = path.join(getMediaPath(), 'Audio')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}

function getDocumentPath() {
  const dir = path.join(getMediaPath(), 'Files')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}

function getMediaPath() {
  const dir = path.join(getAppPath(), 'media')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}

function getAppPath() {
  const dir = remote.app.getPath('userData')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}
