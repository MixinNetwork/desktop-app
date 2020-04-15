import db from '@/persistence/db'

class StickerDao {
  getStickerAlbums(ca?: string) {
    const category = ca || 'SYSTEM'
    return db.prepare(`SELECT * FROM sticker_albums WHERE category = '${category}' ORDER BY created_at DESC`).all()
  }
  getStickersByAlbumId(id: any) {
    return db
      .prepare(
        `SELECT s.* FROM sticker_relationships sr INNER JOIN stickers s ON s.sticker_id = sr.sticker_id WHERE sr.album_id = ? ORDER BY s.created_at DESC`
      )
      .all(id)
  }
  getPersonalStickers() {
    return db
      .prepare(
        `SELECT s.* FROM sticker_albums sa
        INNER JOIN sticker_relationships sr ON sr.album_id = sa.album_id
        INNER JOIN stickers s ON sr.sticker_id = s.sticker_id
        WHERE sa.category = 'PERSONAL' ORDER BY s.created_at`
      )
      .all()
  }
  getLastUseStickers() {
    return db.prepare(`SELECT * FROM stickers WHERE last_use_at > 0 ORDER BY last_use_at DESC LIMIT 20`).all()
  }
  getStickerByUnique(stickerId: any) {
    return db.prepare(`SELECT * FROM stickers WHERE sticker_id = ?`).get(stickerId)
  }
  insertAlbum(s: any) {
    db.prepare(
      `INSERT OR REPLACE INTO sticker_albums VALUES (@album_id, @name, @icon_url, @created_at, @update_at, @user_id, @category, @description)`
    ).run(s)
  }
  insertUpdate(s: any) {
    const sticker = this.getStickerByUnique(s.sticker_id)
    if (sticker) {
      s.last_use_at = s.last_use_at || sticker.last_use_at
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
    db.prepare(`INSERT OR REPLACE INTO sticker_relationships VALUES (@album_id, @sticker_id)`).run(s)
  }
  updateStickerUrl(path: any, id: any) {
    return db.prepare(`UPDATE stickers SET asset_url = ? WHERE sticker_id = ?`).run([path, id])
  }
}

export default new StickerDao()
