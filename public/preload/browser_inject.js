const { remote, nativeTheme } = require('electron')

if (remote) {
  const conversationId = remote.app.getConversationId()
  let appearance = 'light'
  if (nativeTheme && nativeTheme.shouldUseDarkColors) {
    appearance = 'dark'
  }

  const mixinContext = {
    conversation_id: conversationId,
    immersive: false,
    app_version: remote.app.getVersion(),
    appearance
  }

  const { pathname, host } = window.location
  if (['mixin-www.zeromesh.net', 'mixin.one'].indexOf(host) > -1 && pathname === '/oauth/authorize') {
    window.MixinContext = {}
  } else {
    window.MixinContext = {
      getContext: function() {
        return JSON.stringify(mixinContext)
      }
    }
  }
}
