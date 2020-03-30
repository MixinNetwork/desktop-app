const { remote, nativeTheme } = require('electron')

if (remote) {
  const conversationId = remote.app.getConversationId()
  let appearance = 'light'
  if (nativeTheme && nativeTheme.shouldUseDarkColors) {
    appearance = 'dark'
  }

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
