import { ipcMain, screen, BrowserWindow } from 'electron'
import path from 'path'

function createPlayerWindow(w: any, h: any, pin: any) {
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
    width: ww,
    height: wh,
    minWidth: 160,
    minHeight: 120,
    // @ts-ignore
    icon: path.join(__static, 'icon.png'),
    titleBarStyle: 'customButtonsOnHover',
    frame: false,
    webPreferences: {
      nodeIntegration: true
    },
    show: false
  })
  // @ts-ignore
  // playerWindow.setAspectRatio(w / h)
  if (pin === 'true') {
    playerWindow.setAlwaysOnTop(true, 'floating', 1)
  } else {
    playerWindow.setAlwaysOnTop(false)
  }
  if (process.platform !== 'darwin') {
    playerWindow.setMenuBarVisibility(false)
    playerWindow.autoHideMenuBar = true
    playerWindow.setMenu(null)
  }
  playerWindow.setBackgroundColor('#000000')
  return playerWindow
}

export function initPlayer(id: number) {
  ipcMain.on('pinToggle', (event, pin) => {
    BrowserWindow.getAllWindows().forEach(item => {
      if (item.id !== id) {
        if (pin) {
          item.setAlwaysOnTop(true, 'floating', 1)
        } else {
          item.setAlwaysOnTop(false)
        }
      }
    })
  })

  ipcMain.on('closePlayer', (event, _) => {
    BrowserWindow.getAllWindows().forEach(item => {
      if (item.id !== id) {
        item.close()
      }
    })
  })
  ipcMain.on('minimizePlayer', (event, _) => {
    BrowserWindow.getAllWindows().forEach(item => {
      if (item.id !== id) {
        item.minimize()
      }
    })
  })

  function getPlayerWindow() {
    return BrowserWindow.getAllWindows().find(item => {
      return item.id !== id
    })
  }

  let currentURL: any = null
  let playerWindow: any = null
  let resizeObj: any = {}
  ipcMain.on('play', (event, args) => {
    playerWindow = getPlayerWindow()
    if (args.url !== currentURL) {
      if (playerWindow != null) {
        playerWindow.close()
      }
      playerWindow = createPlayerWindow(args.width, args.height, args.pin)
      playerWindow.on('ready-to-show', () => {
        playerWindow.show()
      })
      currentURL = args.url
    } else if (playerWindow) {
      playerWindow.show()
      return
    } else {
      playerWindow = createPlayerWindow(args.width, args.height, args.pin)
      currentURL = args.url
    }
    let params = `#player?thumb=${args.thumb}&url=${args.url}`
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      playerWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL + params)
    } else {
      playerWindow.loadURL('app://./index.html' + params)
    }
    playerWindow.on('ready-to-show', () => {
      playerWindow.show()
    })
    if (process.platform !== 'darwin') {
      playerWindow.on('resize', () => {
        const { width, height } = resizeObj
        const winSize = playerWindow.getSize()
        if (winSize.width !== width || winSize.height !== height) {
          playerWindow.setSize(width, height)
        }
      })
    }
  })

  ipcMain.on('resize', (event, args) => {
    const { width, height } = args
    if (playerWindow) {
      resizeObj = args
      playerWindow.setSize(width, height)
      // for macOS
      playerWindow.setAspectRatio(width / height)
    }
  })
}
