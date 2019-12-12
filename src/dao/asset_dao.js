import db from '@/persistence/db'

class AssetDao {
  insert(asset) {
    const stmt = db.prepare('INSERT OR REPLACE INTO assets VALUES (' +
      '@asset_id, @symbol, @name, @icon_url, @balance, @destination, @tag, @price_btc, @price_usd, @chain_id, @change_usd, @change_btc, @confirmations, @asset_key)')
    stmt.run(asset)
  }

  getAssets() {
    return db.prepare('SELECT * FROM assets').all()
  }
  getAssetById(assetId) {
    return db.prepare(`SELECT * FROM assets WHERE asset_id = ?`).get(assetId)
  }
}

export default new AssetDao()
