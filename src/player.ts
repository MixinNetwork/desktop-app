import { ipcMain, screen, BrowserWindow } from 'electron'
import path from 'path'
import log from 'electron-log'

let playerWindow: any = null
let resizeObj: any = {}
let resizeInterval: any = null

function createPlayerWindow(w: any, h: any) {
  let { width, height } = screen.getPrimaryDisplay().workArea
  let ww, wh
  if (w > h) {
    ww = Math.floor(width / 2)
    wh = Math.floor((ww * h) / w)
  } else {
    wh = Math.floor(height / 2)
    ww = Math.floor((wh * w) / h)
  }
  let playerWindow = new BrowserWindow({
    x: width - ww,
    y: height - wh,
    width: ww,
    height: wh,
    minWidth: 160,
    minHeight: 120,
    // @ts-ignore
    icon: path.join(__static, 'icon.png'),
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      webSecurity: false
    },
    show: false
  })
  // @ts-ignore
  // playerWindow.setAspectRatio(w / h)
  if (process.platform !== 'darwin') {
    playerWindow.setMenuBarVisibility(false)
    playerWindow.autoHideMenuBar = true
    playerWindow.setMenu(null)
  }
  playerWindow.setBackgroundColor('#000000')

  const params = `#player`
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    playerWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL + params)
  } else {
    playerWindow.loadURL('app://./index.html' + params)
  }

  clearInterval(resizeInterval)
  resizeInterval = setInterval(() => {
    try {
      const winSize = playerWindow.getSize()
      const { width, height } = resizeObj
      if (winSize[0] !== width || winSize[1] !== height) {
        if (width > 0 && height > 0) {
          playerWindow.setSize(width, height)
        }
      }
    } catch (error) {}
  }, 100)

  return playerWindow
}

export function initPlayer() {
  if (playerWindow) return playerWindow
  playerWindow = createPlayerWindow(360, 220)

  ipcMain.on('pinToggle', (event, pin) => {
    if (pin) {
      playerWindow.setAlwaysOnTop(true, 'floating', 1)
    } else {
      playerWindow.setAlwaysOnTop(false)
    }
  })

  ipcMain.on('closePlayer', (event, _) => {
    try {
      playerWindow.webContents.send('playRequestData', JSON.stringify({}))
      playerWindow.hide()
    } catch (error) {
      playerWindow = null
      playerWindow = createPlayerWindow(360, 220)
      setTimeout(() => {
        playerWindow.webContents.send('playRequestData', JSON.stringify({}))
      }, 1000)
    }
  })

  ipcMain.on('minimizePlayer', (event, _) => {
    playerWindow.minimize()
  })

  ipcMain.on('play', (event, args) => {
    try {
      playerWindow.webContents.send('playRequestData', JSON.stringify(args))
      playerWindow.show()
    } catch (error) {
      playerWindow = null
      playerWindow = createPlayerWindow(360, 220)
      setTimeout(() => {
        playerWindow.webContents.send('playRequestData', JSON.stringify(args))
        playerWindow.show()
      }, 1000)
    }
  })

  ipcMain.on('resize', (event, args) => {
    const { width, height } = args
    if (playerWindow) {
      playerWindow.setSize(width, height)
      resizeObj = { width, height }
      // for macOS
      playerWindow.setAspectRatio(width / height)
      clearInterval(resizeInterval)
    }
  })
}
