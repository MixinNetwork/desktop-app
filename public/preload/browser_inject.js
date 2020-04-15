const { remote, nativeTheme } = require('electron')

if (remote) {
  const conversationId = remote.app.getConversationId()
  let appearance = 'light'
  if (nativeTheme && nativeTheme.shouldUseDarkColors) {
    appearance = 'dark'
  }

  setInterval(() => {
    const list = document.querySelectorAll('audio')
    if (list.length < 1) return
    list.forEach(item => {
      if (item.volume < 1) {
        item.volume = 1
      }
    })
  }, 1000)

  const mixinContext = {
    platform: 'Desktop',
    conversation_id: conversationId,
    immersive: false,
    app_version: remote.app.getVersion(),
    appearance
  }

  window.MixinContext = {
    getContext: function() {
      return JSON.stringify(mixinContext)
    }
  }
}
