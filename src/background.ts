'use strict'

import { app, protocol, ipcMain, shell, BrowserWindow, globalShortcut, Tray, Menu, powerMonitor } from 'electron'
import windowStateKeeper from 'electron-window-state'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { setFocusWindow, setSilentUpdate, checkForUpdatesOrign } from './updater'
import { initTask } from './task'
import { initPlayer } from './player'
import path from 'path'

app.disableHardwareAcceleration()

app.allowRendererProcessReuse = true

ipcMain.on('updateBadgeCount', (event, count) => {
  if (process.platform === 'darwin') {
    app.badgeCount = count
  }
})

ipcMain.on('checkUp', (event, _) => {
  setSilentUpdate(false)
  checkForUpdatesOrign()
})
const isDevelopment = process.env.NODE_ENV !== 'production'

function ScheduledTask() {
  setTimeout(() => {
    setSilentUpdate(true)
    checkForUpdatesOrign()
    ScheduledTask()
  }, 86400000)
}
if (!isDevelopment) {
  ScheduledTask()
  setTimeout(() => {
    setSilentUpdate(true)
    checkForUpdatesOrign()
  }, 600000)
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: any = null
let appTray: any = null
let _interval: any = null

let quitting = false
let appReady = false

function registerLocalVideoProtocol () {
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''));
    const parts = pathname.split('?')
    callback(parts[0]);
  });
}

// Standard scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, supportFetchAPI: true, secure: true } }
])

function createWindow() {
  powerMonitor.on('suspend', () => {
    win.webContents.send('system-sleep')
  })

  powerMonitor.on('resume', () => {
    win.webContents.send('system-resume')
  })

  globalShortcut.register('ctrl+shift+i', function() {
    if (win) {
      win.webContents.openDevTools()
    }
  })

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
      webSecurity: false,
      enableRemoteModule: true,
      allowRendererProcessReuse: false
    },
    frame: process.platform === 'linux'
  })
  if (win) {
    win.show()
  }

  let currentConversationId = ''
  ipcMain.on('currentConversationId', (event, data) => {
    currentConversationId = data
  })
  // @ts-ignore
  app.getConversationId = function() {
    return currentConversationId
  }

  mainWindowState.manage(win)

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    if (!process.env.IS_TEST) win.webContents.openDevTools()
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  win.on('close', async(e: any) => {
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
      if (process.platform === 'linux') {
        app.quit()
      }

      if (process.platform === 'win32') {
        appTray = new Tray('resources/icon/icon.ico')
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
            appTray.destroy()
          }
        })
      }
    }
  })

  win.on('closed', () => {
    win = null
  })

  win.webContents.on('new-window', function(event: any, url: string) {
    event.preventDefault()
    shell.openExternal(url)
  })
  setFocusWindow(win)
  if (process.platform === 'darwin') {
    require('./menu')
  } else if (process.platform === 'linux') {
    win.setMenuBarVisibility(false)
    win.autoHideMenuBar = true
  } else {
    win.setMenu(null)
  }
  app.setAppUserModelId('one.mixin.messenger')

  app.setAsDefaultProtocolClient('mixin')
  app.on('open-url', function(event, url) {
    event.preventDefault()
    if (win) {
      win.show()
      win.webContents.send('mixin-protocol', url)
    }
  })

  ipcMain.on('showWin', (event, _) => {
    if (win) {
      win.show()
    }
  })

  ipcMain.on('initTask', (event, _) => {
    if (win) {
      initTask(win)
    }
  })

  ipcMain.on('initPlayer', (event, _) => {
    initPlayer()
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
    if (appReady) {
      createWindow()
    } else {
      clearInterval(_interval)
      _interval = setInterval(() => {
        if (appReady) {
          createWindow()
          clearInterval(_interval)
        }
      }, 1000)
    }
  } else {
    win.show()
  }
})

if (!isDevelopment) {
  const lock = app.requestSingleInstanceLock()
  if (!lock) {
    app.quit()
  } else {
    app.on('second-instance', (event, argv, cwd) => {
      if (win) {
        win.show()
        if (win.isMinimized()) win.restore()
        win.focus()
        if (process.platform === 'win32' && appTray) {
          appTray.destroy()
        }
      }
    })
    app.on('ready', async() => {
      appReady = true
      createWindow()
      registerLocalVideoProtocol()
    })
  }
} else {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', async() => {
    appReady = true
    if (isDevelopment && !process.env.IS_TEST) {
      // Install Vue Devtools
      try {
        installExtension({
          id: 'ljjemllljcmogpfapbkkighbhhppjdbg',
          electron: '>=1.2.1'
        })
        //await installExtension(VUEJS_DEVTOOLS)
      } catch (e) {
        console.error('Vue Devtools failed to install:', e.toString())
      }
    }
    createWindow()
    registerLocalVideoProtocol()
  })
}

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
