import { remote } from 'electron'
let { BrowserWindow } = remote

let browser = null

export default {
  loadURL(url) {
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
