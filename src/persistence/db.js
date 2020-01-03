import DB from './wrapper'

import path from 'path'
import { getDbPath } from './db_util'

const mixinPath = path.join(getDbPath(), 'mixin.db3')
DB({
  path: mixinPath,
  memory: false,
  readonly: false,
  fileMustExist: false,
  WAL: true,
  migrate: {
    force: false,
    table: 'migration',
    migrationsPath: './migrations'
  }
})

const mixinDb = DB().connection()

setTimeout(() => {
  const row = mixinDb.prepare('PRAGMA user_version').get()
  if (!!row && row.user_version < 1) {
    mixinDb.transaction(() => {
      mixinDb.exec('DROP TABLE IF EXISTS assets')
      mixinDb.exec('DROP TABLE IF EXISTS snapshots')
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
