import DB from './wrapper'

import path from 'path'
import { getDbPath } from './db_util'

const mixinPath = path.join(getDbPath(), 'mixin.db3')
// eslint-disable-next-line no-undef
const migration = path.join(__static, '/migrations')
DB({
  path: mixinPath,
  readonly: false,
  fileMustExist: false,
  WAL: true,
  migrate: {
    force: false,
    table: 'migration',
    migrationsPath: migration
  }
})

const mixinDb = DB().connection()

const MixinDatabaseVersion = 5

setTimeout(() => {
  const row = mixinDb.prepare('PRAGMA user_version').get()
  if (row && row.user_version < MixinDatabaseVersion) {
    const stmt = mixinDb.prepare(`PRAGMA user_version = ${MixinDatabaseVersion}`)
    mixinDb.transaction(() => {
      if (row.user_version < 1) {
        mixinDb.exec('DROP TABLE IF EXISTS assets')
        mixinDb.exec(
          'CREATE TABLE IF NOT EXISTS `assets` (`asset_id` TEXT NOT NULL,`symbol` TEXT NOT NULL,`name` TEXT NOT NULL,`icon_url` TEXT NOT NULL,`balance` TEXT NOT NULL,`destination` TEXT NOT NULL,`tag` TEXT,`price_btc` TEXT NOT NULL,`price_usd` TEXT NOT NULL,`chain_id` TEXT NOT NULL,`change_usd` TEXT NOT NULL,`change_btc` TEXT NOT NULL,`confirmations` INTEGER NOT NULL,`asset_key` TEXT,PRIMARY KEY(`asset_id`))'
        )
        mixinDb.exec('DROP TABLE IF EXISTS snapshots')
        mixinDb.exec(
          'CREATE TABLE IF NOT EXISTS `snapshots` (`snapshot_id` TEXT NOT NULL,`type` TEXT NOT NULL,`asset_id` TEXT NOT NULL,`amount` TEXT NOT NULL,`created_at` TEXT NOT NULL,`opponent_id` TEXT,`transaction_hash` TEXT,`sender` TEXT,`receiver` TEXT,`memo` TEXT,`confirmations` INTEGER,PRIMARY KEY(`snapshot_id`))'
        )
      }
      stmt.run()
    })()
  }
})

export function clearKeyTable(sessionId) {
  mixinDb.transaction(() => {
    mixinDb.exec('UPDATE participant_session SET sent_to_server = NULL')
    mixinDb.exec(`DELETE FROM participant_session WHERE session_id = '${sessionId}'`)
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
