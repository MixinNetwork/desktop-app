import attachmentApi from '@/api/attachment'
import { remote } from 'electron'
import { MimeType } from '@/utils/constants'
import fs from 'fs'
import path from 'path'
import sizeOf from 'image-size'
import jo from 'jpeg-autorotate'
import cryptoAttachment from '@/crypto/crypto_attachment'
import { base64ToUint8Array } from '@/utils/util.js'
import conversationAPI from '@/api/conversation.js'

import { SequentialTaskQueue } from 'sequential-task-queue'
export let downloadQueue = new SequentialTaskQueue()

export async function downloadAttachment(message) {
  try {
    const response = await attachmentApi.getAttachment(message.content)
    if (response.data.data) {
      var dir
      if (message.category.endsWith('_IMAGE')) {
        dir = getImagePath()
      } else if (message.category.endsWith('_VIDEO')) {
        dir = getVideoPath()
      } else if (message.category.endsWith('_DATA')) {
        dir = getDocumentPath()
      } else if (message.category.endsWith('_AUDIO')) {
        dir = getAudioPath()
      } else {
        return null
      }
      if (message.category.startsWith('SIGNAL_')) {
        const data = await getAttachment(response.data.data.view_url)
        const m = message
        const mediaKey = base64ToUint8Array(m.media_key).buffer
        const mediaDigest = base64ToUint8Array(m.media_digest).buffer
        const resp = await cryptoAttachment.decryptAttachment(data, mediaKey, mediaDigest)
        const name = generateName(m.name, m.media_mime_type, m.category)
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
        const data = await getAttachment(response.data.data.view_url)
        const m = message
        const name = generateName(m.name, m.media_mime_type, m.category)
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

function processAttachment(imagePath, mimeType, category) {
  const fileName = path.parse(imagePath).base
  let type = mimeType
  if (mimeType && mimeType.length > 0) type = path.parse(imagePath).extension
  const destination = path.join(getImagePath(), generateName(fileName, type, category))
  fs.copyFileSync(imagePath, destination)
  return { localPath: destination, name: fileName }
}

export async function base64ToImage(img, mimeType) {
  var data = img.replace(/^data:image\/\w+;base64,/, '')
  var buf = Buffer.from(data, 'base64')
  const destination = path.join(getImagePath(), generateName(null, mimeType, '_IMAGE'))
  await fs.writeFileSync(destination, buf)
  return { path: destination, type: mimeType }
}

function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i]
  }
  return ab
}
export async function putAttachment(imagePath, mimeType, category, processCallback, sendCallback, errorCallback) {
  const { localPath, name } = processAttachment(imagePath, mimeType, category)
  var mediaWidth = null
  var mediaHeight = null
  var thumbImage = null
  if (category.endsWith('_IMAGE')) {
    const dimensions = sizeOf(localPath)
    mediaWidth = dimensions.width
    mediaHeight = dimensions.height
    thumbImage =
      'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAA3NCSVQICAjb4U/gAAAAYUlEQVRoge3PQQ0AIBDAMMC/tBOFCB4Nyapg2zOzfnZ0wKsGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAub6QLkWqfRyQAAAABJRU5ErkJggg=='
  }
  var buffer = fs.readFileSync(localPath)
  var key
  var digest
  const message = {
    name: name,
    mediaSize: buffer.byteLength,
    mediaWidth: mediaWidth,
    mediaHeight: mediaHeight,
    mediaUrl: `file://${localPath}`,
    mediaMimeType: mimeType,
    thumbImage: thumbImage
  }
  if (category.startsWith('SIGNAL_')) {
    // eslint-disable-next-line no-undef
    key = libsignal.crypto.getRandomBytes(64)
    // eslint-disable-next-line no-undef
    const iv = libsignal.crypto.getRandomBytes(16)
    const buf = toArrayBuffer(buffer)
    await cryptoAttachment.encryptAttachment(buf, key, iv).then(result => {
      buffer = result.ciphertext
      digest = result.digest
    })
  }
  processCallback(message)
  const result = await conversationAPI.requestAttachment()
  if (result.status !== 200) {
    errorCallback(`Error ${result.status}`)
    return
  }
  const url = result.data.data.upload_url
  const attachmentId = result.data.data.attachment_id
  fetch(url, {
    method: 'PUT',
    body: buffer,
    headers: {
      'x-amz-acl': 'public-read',
      Connection: 'close',
      'Content-Length': buffer.byteLength,
      'Content-Type': 'application/octet-stream'
    }
  }).then(
    function(resp) {
      if (resp.status === 200) {
        sendCallback({
          attachment_id: attachmentId,
          mime_type: mimeType,
          size: buffer.byteLength,
          width: mediaWidth,
          height: mediaHeight,
          name: name,
          thumbnail: thumbImage,
          digest: btoa(String.fromCharCode(...new Uint8Array(digest))),
          key: btoa(String.fromCharCode(...new Uint8Array(key)))
        })
      } else {
        errorCallback(resp.status)
      }
    },
    error => {
      errorCallback(error)
    }
  )
}

export async function uploadAttachment(localPath, category, sendCallback, errorCallback) {
  var key
  var digest
  var buffer = fs.readFileSync(localPath)
  if (category.startsWith('SIGNAL_')) {
    // eslint-disable-next-line no-undef
    key = libsignal.crypto.getRandomBytes(64)
    // eslint-disable-next-line no-undef
    const iv = libsignal.crypto.getRandomBytes(16)
    const buf = toArrayBuffer(buffer)
    await cryptoAttachment.encryptAttachment(buf, key, iv).then(result => {
      buffer = result.ciphertext
      digest = result.digest
    })
  }
  const result = await conversationAPI.requestAttachment()
  if (result.status !== 200) {
    errorCallback(`Error ${result.status}`)
    return
  }
  const url = result.data.data.upload_url
  const attachmentId = result.data.data.attachment_id
  fetch(url, {
    method: 'PUT',
    body: buffer,
    headers: {
      'x-amz-acl': 'public-read',
      Connection: 'close',
      'Content-Length': buffer.byteLength,
      'Content-Type': 'application/octet-stream'
    }
  }).then(
    function(resp) {
      if (resp.status === 200) {
        sendCallback(
          attachmentId,
          btoa(String.fromCharCode(...new Uint8Array(key))),
          btoa(String.fromCharCode(...new Uint8Array(digest)))
        )
      } else {
        errorCallback(resp.status)
      }
    },
    error => {
      errorCallback(error)
    }
  )
}

function generateName(fileName, mimeType, category) {
  const date = new Date()
  const name = `${date.getFullYear()}${date.getMonth()}${date.getDay()}_${date.getHours()}${date.getMinutes()}${date.getSeconds()}`
  var header
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
  var extension
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

export function isImage(mimeType) {
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

function parseFile(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = function(event) {
      const content = event.target.result
      resolve(content)
    }
    reader.onerror = function(event) {
      reject(event)
    }
    reader.readAsArrayBuffer(blob)
  })
}

function getAttachment(url) {
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  })
    .then(function(resp) {
      let code = parseInt(resp.status)
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
}

function getImagePath() {
  const dir = path.join(getMediaPath(), 'Image')
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
