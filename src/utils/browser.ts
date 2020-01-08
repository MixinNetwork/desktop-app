import { remote } from 'electron'
let { BrowserWindow } = remote

let browser: Electron.BrowserWindow | null = null

export default {
  loadURL(url: any) {
    if (!browser) {
      browser = new BrowserWindow({
        resizable: false,
        minimizable: false,
        fullscreenable: false
      })
      browser.on('closed', () => {
        browser = null
      })
    }
    browser.loadURL(url)
    browser.moveTop()
  }
}
