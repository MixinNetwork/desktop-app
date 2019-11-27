import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { getDbPath } from './db_util'

const MixinDatabaseVersion = 2
const mixinPath = path.join(getDbPath(), 'mixin.db')
const mixinDb = new Database(mixinPath, { readonly: false })
mixinDb.pragma('journal_mode = WAL')
// eslint-disable-next-line no-undef
const fileLocation = path.join(__static, 'mixin.sql')
const createSQL = fs.readFileSync(fileLocation, 'utf8')
mixinDb.exec(createSQL)

function MIGRATION_0_1_2() {
  const stmt = mixinDb.prepare(`PRAGMA user_version = ${MixinDatabaseVersion}`)
  // eslint-disable-next-line no-undef
  const dropLocation = path.join(__static, 'mixin_drop.sql')
  const dropSQL = fs.readFileSync(dropLocation, 'utf8')
  // eslint-disable-next-line no-undef
  const createLocation = path.join(__static, 'mixin.sql')
  const createSQL = fs.readFileSync(createLocation, 'utf8')
  mixinDb.exec(dropSQL)
  mixinDb.exec(createSQL)
  mixinDb.exec('ALTER TABLE messages ADD COLUMN thumb_url TEXT')
  stmt.run()
}

export function checkDb(callback) {
  const row = mixinDb.prepare('PRAGMA user_version').get()
  if (row.user_version <= 1 && MixinDatabaseVersion === 2) {
    MIGRATION_0_1_2()
    const version = 2
    callback(version)
  }
}

export function clearKeyTable() {
  mixinDb.transaction(() => {
    mixinDb.exec('UPDATE participant_session SET sent_to_server = NULL')
  })()
}

export function clearAllTables() {
  mixinDb.transaction(() => {
    mixinDb.exec('DELETE FROM `users`')
    mixinDb.exec('DELETE FROM `participant_session`')
    mixinDb.exec('DELETE FROM `conversations`')
    mixinDb.exec('DELETE FROM `messages`')
    mixinDb.exec('DELETE FROM `participants`')
    mixinDb.exec('DELETE FROM `offsets`')
    mixinDb.exec('DELETE FROM `assets`')
    mixinDb.exec('DELETE FROM `snapshots`')
    mixinDb.exec('DELETE FROM `messages_history`')
    mixinDb.exec('DELETE FROM `sent_session_sender_keys`')
    mixinDb.exec('DELETE FROM `stickers`')
    mixinDb.exec('DELETE FROM `sticker_albums`')
    mixinDb.exec('DELETE FROM `apps`')
    mixinDb.exec('DELETE FROM `hyperlinks`')
    mixinDb.exec('DELETE FROM `flood_messages`')
    mixinDb.exec('DELETE FROM `addresses`')
    mixinDb.exec('DELETE FROM `resend_messages`')
    mixinDb.exec('DELETE FROM `sticker_relationships`')
    mixinDb.exec('DELETE FROM `jobs`')
  })()
}

export default mixinDb
