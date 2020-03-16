import { remote } from 'electron'
let { BrowserWindow } = remote

let browser: any = null

export default {
  loadURL(url: any) {
    if (!browser) {
      browser = new BrowserWindow({
        resizable: false,
        minimizable: false,
        fullscreenable: false,
        show: false
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
