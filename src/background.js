'use strict'

import { app, protocol, ipcMain, shell, BrowserWindow } from 'electron'
import { createProtocol, installVueDevtools } from 'vue-cli-plugin-electron-builder/lib'
import { autoUpdater } from 'electron-updater'
import { setFocusWindow } from './updater'
import path from 'path'

ipcMain.on('checkUp', (event, _) => {
  autoUpdater.checkForUpdates()
})
const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

// Standard scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, supportFetchAPI: true, secure: true } }
])
function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    // eslint-disable-next-line no-undef
    icon: path.join(__static, 'icon.png'),
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false
    }
  })

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
    if (process.platform === 'darwin') {
      if (app.quitting) {
        win = null
      } else {
        e.preventDefault()
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
  }
  app.setAppUserModelId('one.mixin.messenger')
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
  if (win === null) {
    createWindow()
  } else {
    win.show()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installVueDevtools()
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

app.on('before-quit', () => {
  app.quitting = true
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
