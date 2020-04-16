const path = require('path')
const fs = require('fs')

let userDataPath = ''

function setUserDataPath(dir) {
  userDataPath = dir
}

function _getMediaPath(dir, type, identityNumber, conversationId) {
  if (identityNumber) {
    dir = path.join(getMediaPath(identityNumber), type)
  }
  if (localStorage.newUserDirExist && !fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  if (identityNumber && conversationId) {
    dir = path.join(dir, `${conversationId}`)
    if (localStorage.newUserDirExist && !fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
  }
  return dir
}

function getMediaPath(identityNumber) {
  let dir = path.join(getAppPath(), 'media')
  if (identityNumber) {
    dir = path.join(getAppPath(identityNumber), 'Media')
  }
  if (localStorage.newUserDirExist && !fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}

function getAppPath(identityNumber) {
  let dir = userDataPath
  if (identityNumber) {
    dir = path.join(dir, identityNumber)
  }
  if (localStorage.newUserDirExist && !fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}

function getImagePath(identityNumber, conversationId) {
  const dir = path.join(getMediaPath(), 'Image')
  return _getMediaPath(dir, 'Images', identityNumber, conversationId)
}

function getVideoPath(identityNumber, conversationId) {
  const dir = path.join(getMediaPath(), 'Video')
  return _getMediaPath(dir, 'Videos', identityNumber, conversationId)
}

function getAudioPath(identityNumber, conversationId) {
  const dir = path.join(getMediaPath(), 'Audio')
  return _getMediaPath(dir, 'Audios', identityNumber, conversationId)
}

function getDocumentPath(identityNumber, conversationId) {
  const dir = path.join(getMediaPath(), 'Files')
  return _getMediaPath(dir, 'Files', identityNumber, conversationId)
}

function getStickerPath(identityNumber) {
  const dir = path.join(getMediaPath(), 'Sticker')
  return _getMediaPath(dir, 'Stickers', identityNumber)
}

module.exports = {
  getImagePath,
  getVideoPath,
  getAudioPath,
  getDocumentPath,
  getStickerPath,
  setUserDataPath
}
