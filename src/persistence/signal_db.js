import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { getDbPath } from './db_util'

const signalPath = path.join(getDbPath(), 'signal.db')
const signalDb = new Database(signalPath, { readonly: false })
signalDb.pragma('journal_mode = WAL')
// eslint-disable-next-line no-undef
const fileLocation = path.join(__static, 'signal.sql')
const createSQL = fs.readFileSync(fileLocation, 'utf8')
signalDb.exec(createSQL)

export function clearAllTables() {
  signalDb.transaction(() => {
    signalDb.exec('DELETE FROM `identities`')
    signalDb.exec('DELETE FROM `prekeys`')
    signalDb.exec('DELETE FROM `signed_prekeys`')
    signalDb.exec('DELETE FROM `sessions`')
    signalDb.exec('DELETE FROM `sender_keys`')
  })()
}
export default signalDb
