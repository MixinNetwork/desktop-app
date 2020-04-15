import { remote, ipcRenderer } from 'electron'
let { BrowserWindow } = remote

let browser: any = null

const path = require('path')
// @ts-ignore
const preloadFile = path.join(__static, 'preload/browser_inject.js')

export default {
  loadURL(url: any, conversationId: string) {
    if (conversationId) {
      ipcRenderer.send('currentConversationId', conversationId)
    }
    if (!browser) {
      browser = new BrowserWindow({
        resizable: false,
        minimizable: false,
        fullscreenable: false,
        webPreferences: {
          // sandbox: true,
          preload: preloadFile
        }
      })
      browser.on('closed', () => {
        browser = null
      })
    }
    browser.loadURL(url)
    browser.moveTop()
  }
}
