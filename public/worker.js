const { parentPort } = require('worker_threads')
const { getImagePath, getVideoPath, getAudioPath, getDocumentPath, setUserDataPath } = require('../src/utils/media_path')

const fs = require('fs')
const path = require('path')

parentPort.once('message', payload => {
  if (payload) {
    const { action, data } = payload
    const { mediaMessages, identityNumber, userDataPath } = data

    if (action === 'copyFile') {
      setUserDataPath(userDataPath)
      mediaMessages.forEach(message => {
        let dir = ''
        let newDir = ''
        const { category, conversationId, messageId, mediaUrl } = message
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
        }
        const src = mediaUrl.split('file://')[1]
        if (src) {
          const dist = path.join(newDir, messageId)
          if (dist !== src && fs.existsSync(src)) {
            fs.writeFileSync(dist, fs.readFileSync(src))
            // updateMediaMessage(`file://${dist}`, messageId)
          }
        }
      })

      return
    }
  }
  parentPort.postMessage('done')
})
