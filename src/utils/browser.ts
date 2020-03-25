import { remote, nativeTheme } from 'electron'
let { BrowserWindow } = remote

let browser: any = null
const appVersion = remote.app.getVersion()

export default {
  loadURL(url: any, conversationId: string) {
    if (!browser) {
      browser = new BrowserWindow({
        resizable: false,
        minimizable: false,
        fullscreenable: false,
        show: false,
        webPreferences: {
          sandbox: true
        }
      })

      let appearance = 'light'
      if (nativeTheme && nativeTheme.shouldUseDarkColors) {
        appearance = 'dark'
      }

      browser.webContents.on('did-finish-load', () => {
        const mixinContext = {
          conversation_id: conversationId,
          immersive: false,
          app_version: appVersion,
          appearance
        }
        browser.webContents.executeJavaScript(
          `window.MixinContext = {
            getContext: function() {
              return '${JSON.stringify(mixinContext)}'
            }
          }`,
          true
        )
      })
      browser.on('closed', () => {
        browser = null
      })
      browser.on('ready-to-show', () => {
        browser.show()
      })
    }
    browser.loadURL(url)
    browser.moveTop()
  }
}
