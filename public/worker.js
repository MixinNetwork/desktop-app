const { parentPort } = require('worker_threads')
const {
  getImagePath,
  getVideoPath,
  getAudioPath,
  getDocumentPath,
  getStickerPath,
  setUserDataPath
} = require('../src/utils/media_path')
const Database = require('better-sqlite3')

const fs = require('fs')
const path = require('path')

parentPort.once('message', payload => {
  if (payload) {
    const { action, data } = payload

    if (action === 'copyFile') {
      const { mediaMessages, identityNumber, userDataPath, dbPath } = data

      const mixinDb = new Database(dbPath, { readonly: false })
      setUserDataPath(userDataPath)
      mediaMessages.forEach(message => {
        let dir = ''
        let newDir = ''
        const { category, conversationId, messageId, mediaUrl, assetUrl } = message
        if (category.endsWith('_IMAGE')) {
          dir = getImagePath()
          newDir = getImagePath(identityNumber, conversationId)
        } else if (category.endsWith('_VIDEO')) {
          dir = getVideoPath()
          newDir = getVideoPath(identityNumber, conversationId)
        } else if (category.endsWith('_DATA')) {
          dir = getDocumentPath()
          newDir = getDocumentPath(identityNumber, conversationId)
        } else if (category.endsWith('_AUDIO')) {
          dir = getAudioPath()
          newDir = getAudioPath(identityNumber, conversationId)
        } else if (category.endsWith('_STICKER')) {
          dir = getStickerPath()
          newDir = getStickerPath(identityNumber)
        }
        let src = ''
        if (mediaUrl) {
          src = mediaUrl.split('file://')[1]
        }
        if (!src && assetUrl) {
          src = assetUrl.split('file://')[1]
        }
        if (src) {
          const dist = path.join(newDir, messageId)
          if (dist !== src && fs.existsSync(src)) {
            fs.writeFileSync(dist, fs.readFileSync(src))
            mixinDb.prepare('UPDATE messages SET media_url = ? WHERE message_id = ?').run([`file://${dist}`, messageId])
            fs.unlinkSync(src)
          }
        }
      })
      const oldMediaDir = path.join(userDataPath, 'media')
      try {
        fs.rmdirSync(oldMediaDir)
      } catch (error) {}
      mixinDb.close()

      return
    }
  }
  parentPort.postMessage('done')
})
