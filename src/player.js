import { ipcMain, screen, BrowserWindow } from 'electron'
import path from 'path'
function createPlayerWindow(w, h, pin) {
  let { width, height } = screen.getPrimaryDisplay().workArea
  let ww, wh
  if (w > h) {
    ww = parseInt(width / 2)
    wh = parseInt((ww * h) / w)
  } else {
    wh = parseInt(height / 2)
    ww = parseInt((wh * w) / h)
  }
  let playerWindow = new BrowserWindow({
    width: ww,
    height: wh,
    minWidth: parseInt(ww / 2),
    minHeight: parseInt(wh / 2),
    // eslint-disable-next-line no-undef
    icon: path.join(__static, 'icon.png'),
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false
    },
    show: false
  })
  playerWindow.setAspectRatio(w / h)
  if (pin === 'true') {
    playerWindow.setAlwaysOnTop(true, 'floating', 1)
  } else {
    playerWindow.setAlwaysOnTop(false)
  }
  return playerWindow
}

export function initPlayer(id) {
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

  var currentURL = null
  ipcMain.on('play', (event, args) => {
    let playerWindow = getPlayerWindow()
    if (args.url !== currentURL) {
      if (playerWindow != null) {
        playerWindow.close()
      }
      playerWindow = createPlayerWindow(args.width, args.height, args.pin)
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
      playerWindow.loadURL('app://./index_player.html' + params)
    }
    playerWindow.show()
  })
}
