import attachmentApi from '@/api/attachment'
import { remote } from 'electron'
import { MimeType } from '@/utils/constants'
import fs from 'fs'
import https from 'https'
import path from 'path'
import sizeOf from 'image-size'
import cryptoAttachment from '@/crypto/crypto_attachment'
import { base64ToUint8Array } from '@/utils/util.js'
import conversationAPI from '@/api/conversation.js'

export async function downloadAttachment(message, callback) {
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
      return
    }
    if (message.category.startsWith('SIGNAL_')) {
      downloadCipher(response.data.data.view_url, data => {
        const mediaKey = base64ToUint8Array(message.media_key).buffer
        const mediaDigest = base64ToUint8Array(message.media_digest).buffer
        cryptoAttachment.decryptAttachment(data, mediaKey, mediaDigest).then(resp => {
          const name = generateName(message.name, message.media_mime_type, message.category)
          const filePath = path.join(dir, name)
          fs.writeFile(filePath, Buffer.from(resp), function(err) {
            if (err) {
              // todo retry
            } else {
              callback(filePath)
            }
          })
        })
      })
    } else {
      downloadPlain(
        response.data.data.view_url,
        dir,
        generateName(message.name, message.media_mime_type, message.category),
        file => {
          callback(file.path)
        }
      )
    }
  } else {
    // todo retry
  }
}

function processAttachment(imagePath, mimeType, category) {
  const fileName = path.parse(imagePath).base
  let type = mimeType
  if (mimeType && mimeType.length > 0) type = path.parse(imagePath).extension
  const destination = path.join(getImagePath(), generateName(fileName, type, category))
  fs.copyFileSync(imagePath, destination)
  return { localPath: destination, name: fileName, type: type }
}
function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i]
  }
  return ab
}
export async function putAttachment(imagePath, mimeType, category, processCallback, sendCallback) {
  const { localPath, name, type } = processAttachment(imagePath, mimeType, category)
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
    mediaMimeType: type,
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
      }
    },
    error => {
      console.log(error)
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
  } else if (category.endsWith('_DATA')) {
    header = 'FILE'
  } else if (category.endsWith('_AUDIO')) {
    header = 'AUDIO'
  }
  var extension
  if (mimeType === MimeType.JPEG.name) {
    extension = MimeType.JPEG.extension
  } else if (mimeType === MimeType.JPEG.name) {
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
    extension = fileName.split('.').pop()
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

function downloadCipher(url, callbackData) {
  fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  })
    .then(function(resp) {
      return resp.blob()
    })
    .then(function(blob) {
      var arrayBuffer
      var fileReader = new FileReader()
      fileReader.onload = function(event) {
        arrayBuffer = event.target.result
        callbackData(arrayBuffer)
      }
      fileReader.readAsArrayBuffer(blob)
    })
}

function downloadPlain(url, dir, name, callback) {
  const filePath = path.join(dir, name)
  const file = fs.createWriteStream(filePath)
  https
    .get(url, function(response) {
      response.pipe(file)
      file.on('finish', function() {
        file.close()
        callback(file)
      })
    })
    .on('error', e => {
      console.error(e)
    })
  file.on('error', err => {
    console.error(err)
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
