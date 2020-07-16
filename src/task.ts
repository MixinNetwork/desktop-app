import { ipcMain, BrowserWindow } from 'electron'

export function initTask(win: any) {
  let sWindow = new BrowserWindow({
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
    sWindow.webContents.send('taskRequestData', JSON.stringify(payload))
  })

  ipcMain.on('taskResponse', (event, res) => {
    win.webContents.send('taskResponseData', JSON.stringify(res))
  })
}
