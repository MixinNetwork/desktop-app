import db from '@/persistence/db'

class StickerDao {
  getStickerByAlbumIdAndName(id, name) {
    return db
      .prepare(
        `SELECT s.* FROM sticker_relationships sr, stickers s WHERE sr.sticker_id = s.sticker_id AND sr.album_id = ? AND s.name = ?`
      )
      .get([id, name])
  }
  getStickerByUnique(stickerId) {
    return db.prepare(`SELECT * FROM stickers WHERE sticker_id = ?`).get(stickerId)
  }
  insertUpdate(s) {
    const sticker = this.getStickerByUnique(s.sticker_id)
    if (sticker) {
      s.last_use_at = sticker.last_use_at
    } else {
      s.last_use_at = null
    }
    if (s.created_at === '') {
      s.created_at = new Date().toISOString()
    }
    s.type = undefined
    db.prepare(
      `INSERT OR REPLACE INTO stickers VALUES (@sticker_id, @album_id, @name, @asset_url, @asset_type, @asset_width, @asset_height, @created_at, @last_use_at)`
    ).run(s)
  }
}

export default new StickerDao()
