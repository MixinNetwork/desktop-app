import { remote } from 'electron'
import path from 'path'
import fs from 'fs'
import { clearAllTables as clearSignal } from './signal_db'
import { clearKeyTable } from './db'
import store from '@/store/store'
const Database = require('better-sqlite3')

export function getDbPath() {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  let dir = remote.app.getPath('userData')
  let identityNumber = ''
  if (localStorage.account) {
    const user = JSON.parse(localStorage.account)
    identityNumber = user.identity_number
  }
  if (!isDevelopment && identityNumber) {
    const newDir = path.join(dir, identityNumber)
    const dbPath = path.join(newDir, `mixin.db3`)
    if (!fs.existsSync(newDir)) {
      localStorage.mediaAndDbMigration = identityNumber
    } else if (fs.existsSync(dbPath)) {
      const mixinDb = new Database(dbPath, { readonly: false })
      const row = mixinDb.prepare('PRAGMA user_version').get()
      mixinDb.close()
      console.log('db version row: ', row)
      if (row && row.user_version > 4) {
        dir = newDir
      }
    }
  }
  return path.join(isDevelopment ? path.join(__static, '../') : dir)
}

export async function dbMigration(identityNumber) {
  const src = path.join(getDbPath(), 'mixin.db3')
  const dist = path.join(remote.app.getPath('userData'), `${identityNumber}/mixin.db3`)
  fs.writeFileSync(dist, fs.readFileSync(src))
  const signalSrc = path.join(getDbPath(), 'signal.db3')
  const signalDist = path.join(remote.app.getPath('userData'), `${identityNumber}/signal.db3`)
  fs.writeFileSync(signalDist, fs.readFileSync(signalSrc))
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
