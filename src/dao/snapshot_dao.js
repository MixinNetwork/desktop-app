import db from '@/persistence/db'

class SnapshotDao {
  insert(snapshot) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO snapshots VALUES (@snapshot_id, @type, @asset_id, @amount, @created_at, @opponent_id, @counter_user_id, @transaction_hash, @sender, @receiver, @memo, @confirmations)'
    )
    stmt.run(snapshot)
  }

  findSnapshot(snapshotId) {
    return db.prepare('SELECT * FROM snapshots WHERE snapshot_id = ?').get(snapshotId)
  }
}

export default new SnapshotDao()
