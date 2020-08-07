import { ipcMain, BrowserWindow } from 'electron'

let sWindow: any = null

export function initTask(win: any) {
  if (sWindow) return sWindow
  sWindow = new BrowserWindow({
    frame: false,
    webPreferences: {
      nodeIntegration: true
    },
    show: false
  })
  const params = '#task'
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    sWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL + params)
  } else {
    sWindow.loadURL('app://./index.html' + params)
  }

  ipcMain.on('taskRequest', (event, payload) => {
    try {
      sWindow.webContents.send('taskRequestData', JSON.stringify(payload))
    } catch (error) {
      sWindow = null
      sWindow = initTask(win)
      setTimeout(() => {
        sWindow.webContents.send('taskRequestData', JSON.stringify(payload))
      }, 1000)
    }
  })

  ipcMain.on('taskResponse', (event, res) => {
    win.webContents.send('taskResponseData', JSON.stringify(res))
  })
  return sWindow
}
