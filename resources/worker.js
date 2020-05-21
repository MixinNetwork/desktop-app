const { parentPort } = require('worker_threads')
const {
  getImagePath,
  getVideoPath,
  getAudioPath,
  getDocumentPath,
  setUserDataPath
} = require('./media_path')
const Database = require('better-sqlite3')

const fs = require('fs')
const path = require('path')

function delDir(path) {
  if (fs.existsSync(path)) {
    const files = fs.readdirSync(path)
    files.forEach(file => {
      let curPath = path + '/' + file
      if (fs.statSync(curPath).isDirectory()) {
        delDir(curPath)
      } else {
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}

parentPort.once('message', payload => {
  if (payload) {
    const { action, data } = payload

    if (action === 'copyFile') {
      const { mediaMessages, identityNumber, userDataPath, dbPath } = data

      const mixinDb = new Database(dbPath, { readonly: false })
      setUserDataPath(userDataPath)
      mediaMessages.forEach(message => {
        let newDir = ''
        const { category, conversationId, messageId, mediaUrl } = message
        if (category.endsWith('_IMAGE')) {
          newDir = getImagePath(identityNumber, conversationId)
        } else if (category.endsWith('_VIDEO')) {
          newDir = getVideoPath(identityNumber, conversationId)
        } else if (category.endsWith('_DATA')) {
          newDir = getDocumentPath(identityNumber, conversationId)
        } else if (category.endsWith('_AUDIO')) {
          newDir = getAudioPath(identityNumber, conversationId)
        }
        const src = mediaUrl.split('file://')[1]
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
      mixinDb.prepare('DELETE FROM stickers').run()
      mixinDb.prepare('DELETE FROM sticker_relationships').run()
      mixinDb.prepare('DELETE FROM sticker_albums').run()
      delDir(oldMediaDir)
      mixinDb.close()

      return
    }
  }
  parentPort.postMessage('done')
})
