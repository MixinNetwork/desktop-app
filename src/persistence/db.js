import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { getDbPath } from './db_util'

const MixinDatabaseVersion = 1
const mixinPath = path.join(getDbPath(), 'mixin.db')
const mixinDb = new Database(mixinPath, { readonly: false })
mixinDb.pragma('journal_mode = WAL')
// eslint-disable-next-line no-undef
const fileLocation = path.join(__static, 'mixin.sql')
const createSQL = fs.readFileSync(fileLocation, 'utf8')
mixinDb.exec(createSQL)
const row = mixinDb.prepare('PRAGMA user_version').get()
if (!!row && row.user_version < MixinDatabaseVersion) {
  if (row.user_version === 0 && MixinDatabaseVersion === 1) {
    const stmt = mixinDb.prepare(`PRAGMA user_version = ${MixinDatabaseVersion}`)
    MIGRATION_0_1()
    stmt.run()
  }
}

function MIGRATION_0_1() {
  mixinDb.exec('ALTER TABLE messages ADD COLUMN thumb_url TEXT')
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
