const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')

let updater, focusedWindow
autoUpdater.autoDownload = false

autoUpdater.on('error', error => {
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
    buttonIndex => {
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
    () => {
      setImmediate(() => autoUpdater.quitAndInstall())
    }
  )
})

// export this to MenuItem click callback
export function checkForUpdates(menuItem, focusedWindow, event) {
  updater = menuItem
  if (updater) {
    updater.enabled = false
  }
  autoUpdater.checkForUpdates()
}

export function setFocusWindow(window) {
  focusedWindow = window
}
