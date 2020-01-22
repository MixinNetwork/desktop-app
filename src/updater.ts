const { app, dialog, BrowserWindow } = require('electron')
const { autoUpdater } = require('electron-updater')

const lang = app.getLocale().split('-')[0]

let updater: any, focusedWindow: any
autoUpdater.autoDownload = false

autoUpdater.on('error', (error: { stack: any } | null) => {
  dialog.showErrorBox('Error: ', error == null ? 'unknown' : (error.stack || error).toString())
})

autoUpdater.on('update-available', () => {
  let infoObj = {
    type: 'info',
    title: 'Found Updates',
    message: 'Found updates, do you want update now?',
    buttons: ['Sure', 'No']
  }
  if (lang === 'zh') {
    infoObj = {
      type: 'info',
      title: '发现更新',
      message: '已发现更新，您现在要进行更新吗？',
      buttons: ['确定', '取消']
    }
  }
  dialog.showMessageBox(
    focusedWindow,
    infoObj,
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
  let infoObj = {
    title: 'No Updates',
    message: 'There are currently no updates available.'
  }
  if (lang === 'zh') {
    infoObj = {
      title: '无需更新',
      message: '当前没有可用的更新'
    }
  }
  dialog.showMessageBox(focusedWindow, infoObj)
  if (updater) {
    updater.enabled = true
    updater = null
  }
})

autoUpdater.on('update-downloaded', () => {
  let infoObj = {
    title: 'Install Updates',
    message: 'Updates downloaded, application will be quit for update...'
  }
  if (lang === 'zh') {
    infoObj = {
      title: '安装更新',
      message: '已下载更新，应用程序将退出以进行更新...'
    }
  }
  dialog.showMessageBox(
    focusedWindow,
    infoObj,
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
