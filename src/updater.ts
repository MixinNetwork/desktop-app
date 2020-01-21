const { app, dialog, BrowserWindow } = require('electron')
const { autoUpdater } = require('electron-updater')

let updater: any, focusedWindow: any
autoUpdater.autoDownload = false

autoUpdater.on('error', (error: { stack: any } | null) => {
  dialog.showErrorBox('Error: ', error == null ? 'unknown' : (error.stack || error).toString())
})

autoUpdater.on('update-available', () => {
  dialog.showMessageBox(
    focusedWindow,
    {
      type: 'info',
      title: 'Found Updates',
      message: 'Found updates, do you want update now?',
      buttons: ['Sure', 'No']
    },
    // @ts-ignore
    (buttonIndex: number) => {
      if (buttonIndex === 0) {
        autoUpdater.downloadUpdate()
      } else {
        if (updater) {
          updater.enabled = true
          updater = null
        }
      }
    }
  )
})

autoUpdater.on('update-not-available', () => {
  dialog.showMessageBox(focusedWindow, {
    title: 'No Updates',
    message: 'There are currently no updates available.'
  })
  if (updater) {
    updater.enabled = true
    updater = null
  }
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(
    focusedWindow,
    {
      title: 'Install Updates',
      message: 'Updates downloaded, application will be quit for update...'
    },
    // @ts-ignore
    () => {
      setImmediate(() => {
        app.removeAllListeners('window-all-closed')
        const browserWindows = BrowserWindow.getAllWindows()
        browserWindows.forEach(function(browserWindow) {
          browserWindow.removeAllListeners('close')
        })
        autoUpdater.quitAndInstall(true, true)
      })
    }
  )
})

// export this to MenuItem click callback
export function checkForUpdates(menuItem: any, focusedWindow: any, event: any) {
  updater = menuItem
  if (updater) {
    updater.enabled = false
  }
  autoUpdater.checkForUpdates()
}

export function setFocusWindow(window: Electron.BrowserWindow) {
  focusedWindow = window
}
