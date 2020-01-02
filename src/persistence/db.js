import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { getDbPath } from './db_util'

const MixinDatabaseVersion = 2
const mixinPath = path.join(getDbPath(), 'mixin.db3')
const mixinDb = new Database(mixinPath, { readonly: false })
mixinDb.pragma('journal_mode = WAL')
// eslint-disable-next-line no-undef
const fileLocation = path.join(__static, 'mixin.sql')
const createSQL = fs.readFileSync(fileLocation, 'utf8')
mixinDb.exec(createSQL)

setTimeout(() => {
  const row = mixinDb.prepare('PRAGMA user_version').get()
  if (!!row && row.user_version < MixinDatabaseVersion) {
    const usersTableInfo = mixinDb.prepare('PRAGMA table_info(users)').all()
    const usersColumns = []
    usersTableInfo.forEach(item => {
      usersColumns.push(item.name)
    })
    const stmt = mixinDb.prepare(`PRAGMA user_version = ${MixinDatabaseVersion}`)
    mixinDb.transaction(() => {
      if (row.user_version < 1) {
        mixinDb.exec('DROP TABLE IF EXISTS assets')
        mixinDb.exec('DROP TABLE IF EXISTS snapshots')
      }
      if (row.user_version < 2) {
        mixinDb.exec(
          'CREATE TABLE `apps_backup` (`app_id` TEXT NOT NULL, `app_number` TEXT NOT NULL, `home_uri` TEXT NOT NULL, `redirect_uri` TEXT NOT NULL, `name` TEXT NOT NULL, `icon_url` TEXT NOT NULL, `description` TEXT NOT NULL, `capabilites` TEXT,  `creator_id` TEXT NOT NULL, PRIMARY KEY(`app_id`))'
        )
        mixinDb.exec(
          'INSERT INTO apps_backup SELECT app_id, app_number, home_uri, redirect_uri, name, icon_url, description, capabilites, creator_id FROM apps'
        )
        mixinDb.exec('DROP TABLE apps')
        mixinDb.exec('ALTER TABLE apps_backup RENAME TO apps')
        if (usersColumns.indexOf('biography') === -1) {
          mixinDb.exec('ALTER TABLE users ADD COLUMN biography TEXT')
        }
      }
      mixinDb.exec('DROP TRIGGER IF EXISTS conversation_unseen_message_count_update')
      mixinDb.exec('DROP TABLE IF EXISTS resend_messages')
      stmt.run()
    })()
  }
})

export function clearKeyTable(sessionId) {
  mixinDb.transaction(() => {
    mixinDb.exec('UPDATE participant_session SET sent_to_server = NULL')
    mixinDb.exec('DELETE FROM participant_session WHERE session_id = "' + sessionId + '"')
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
    mixinDb.exec('DELETE FROM `resend_session_messages`')
    mixinDb.exec('DELETE FROM `sticker_relationships`')
    mixinDb.exec('DELETE FROM `jobs`')
  })()
}

export default mixinDb
