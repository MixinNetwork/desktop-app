'use strict'

import { app, protocol, ipcMain, shell, BrowserWindow, globalShortcut, Tray, Menu } from 'electron'
import windowStateKeeper from 'electron-window-state'
import { createProtocol, installVueDevtools } from 'vue-cli-plugin-electron-builder/lib'
import { autoUpdater } from 'electron-updater'
import { setFocusWindow } from './updater'
import { initPlayer } from './player'
import path from 'path'

ipcMain.on('checkUp', (event, _) => {
  autoUpdater.checkForUpdates()
})
const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: BrowserWindow | null
let appTray = null

let quitting = false

// Standard scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, supportFetchAPI: true, secure: true } }
])
function createWindow() {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 900,
    defaultHeight: 700
  })

  // Create the browser window.
  win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 700,
    minHeight: 500,
    // eslint-disable-next-line no-undef
    icon: path.join(__dirname, '../public/icon.png'),
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false
    }
  })

  mainWindowState.manage(win)

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  win.on('close', async e => {
    if (win !== null) {
      if (quitting) {
        win = null
      } else {
        e.preventDefault()
        if (win.isFullScreen()) {
          win.setFullScreen(false)
          app.hide()
        }
        win.hide()
      }
    }
  })

  win.on('closed', () => {
    win = null
  })

  win.webContents.on('new-window', function(event, url) {
    event.preventDefault()
    shell.openExternal(url)
  })
  setFocusWindow(win)
  if (process.platform === 'darwin') {
    require('./menu')
  } else if (process.platform === 'linux') {
    win.setMenuBarVisibility(false)
    win.setAutoHideMenuBar(true)
  } else {
    win.setMenu(null)
  }
  initPlayer(win.id)
  app.setAppUserModelId('one.mixin.messenger')

  ipcMain.on('showWin', (event, _) => {
    if (win) {
      win.show()
    }
  })
  ipcMain.on('openDevTools', (event, _) => {
    if (win) {
      win.webContents.openDevTools()
    }
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null || typeof win === 'undefined') {
    createWindow()
  } else {
    win.show()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async() => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installVueDevtools()
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
  globalShortcut.register('ctrl+shift+i', function() {
    if (win) {
      win.webContents.openDevTools()
    }
  })

  appTray = new Tray(path.join(__dirname, '../public/icon.png'))
  const lang = app.getLocale().split('-')[0]

  const contextMenu = Menu.buildFromTemplate([
    {
      label: lang !== 'zh' ? 'quit' : '退出',
      click: function() {
        app.quit()
      }
    }
  ])
  appTray.setToolTip('Mixin')
  appTray.setContextMenu(contextMenu)
  appTray.on('click', function() {
    if (win) {
      win.show()
    }
  })
})

app.on('before-quit', () => {
  globalShortcut.unregister('ctrl+shift+i')
  quitting = true
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
