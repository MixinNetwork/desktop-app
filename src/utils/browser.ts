import { remote, ipcRenderer } from 'electron'
import windowStateKeeper from 'electron-window-state'
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
      // Regardless of whether the main window is on the main screen or the external screen,
      // the new window is always displayed on the screen where the main window is located.
      let mainWindowState = windowStateKeeper({})
      browser = new BrowserWindow({
        x: mainWindowState.x + (mainWindowState.width - 800) / 2,
        y: mainWindowState.y + (mainWindowState.height - 600) / 2,
        resizable: false,
        minimizable: false,
        fullscreenable: true,
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
