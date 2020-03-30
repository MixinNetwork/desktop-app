import { remote } from 'electron'
import path from 'path'
import fs from 'fs'
import { clearAllTables as clearSignal } from './signal_db'
import { clearKeyTable } from './db'
import store from '@/store/store'
export function getDbPath() {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  let dir = remote.app.getPath('userData')
  let identityNumber = ''
  if (localStorage.account) {
    const user = JSON.parse(localStorage.account)
    identityNumber = user.identity_number
  }
  if (identityNumber) {
    const newDir = path.join(dir, identityNumber)
    if (!fs.existsSync(newDir)) {
      localStorage.mediaAndDbMigration = identityNumber
    } else if (!localStorage.mediaAndDbMigration) {
      dir = newDir
    }
  }
  const dbPath = path.join(isDevelopment ? path.join(__static, '../') : dir)
  return dbPath
}

export async function dbMigration(identityNumber) {
  const src = path.join(getDbPath(), 'mixin.db3')
  const dist = path.join(remote.app.getPath('userData'), `${identityNumber}/mixin.db`)
  fs.writeFileSync(dist, fs.readFileSync(src))
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
