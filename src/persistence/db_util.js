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
  if (!isDevelopment && identityNumber) {
    const newDir = path.join(dir, identityNumber)
    const dbPath = path.join(newDir, `mixin.db3`)
    if (fs.existsSync(dbPath)) {
      dir = newDir
    }
  }
  return path.join(isDevelopment ? path.join(__static, '../') : dir)
}

async function copyFile(filename, dbPath, distPath) {
  const src = path.join(dbPath, filename)
  if (fs.existsSync(src)) {
    const dist = path.join(distPath, filename)
    let duringMigrationMap = {}
    try {
      duringMigrationMap = JSON.parse(localStorage.duringMigrationMap || '{}')
    } catch (e) {}
    if (fs.existsSync(dist)) {
      if (duringMigrationMap[dist]) {
        fs.unlinkSync(dist)
      }
    } else {
      duringMigrationMap[dist] = true
      localStorage.duringMigrationMap = JSON.stringify(duringMigrationMap)
    }
    if (duringMigrationMap[dist]) {
      fs.writeFileSync(dist, fs.readFileSync(src))
      duringMigrationMap[dist] = false
      localStorage.duringMigrationMap = JSON.stringify(duringMigrationMap)
    }
  }
}

export async function dbMigration(identityNumber) {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  if (isDevelopment) return
  const dbPath = getDbPath()
  const distPath = path.join(remote.app.getPath('userData'), identityNumber)
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath)
  }
  await copyFile('mixin.db3', dbPath, distPath)
  await copyFile('mixin.db3-shm', dbPath, distPath)
  await copyFile('mixin.db3-wal', dbPath, distPath)
  await copyFile('signal.db3', dbPath, distPath)
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
