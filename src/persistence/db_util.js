import { remote } from 'electron'
import path from 'path'
import { clearAllTables as clearSignal } from './signal_db'
import { clearKeyTable } from './db'
import store from '@/store/store'
export function getDbPath() {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  // eslint-disable-next-line no-undef
  const dbPath = path.join(isDevelopment ? path.join(__static, '../') : remote.app.getPath('userData'))
  return dbPath
}

let clearing = false
export function clearDb() {
  if (clearing) {
    return
  }
  clearing = true
  store.dispatch('exit')
  clearKeyTable(localStorage.sessionId)
  clearSignal()
  window.localStorage.clear()
  clearing = false
}
