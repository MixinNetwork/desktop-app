import db from '@/persistence/db'

class AssetDao {
  insert(asset) {
    const stmt = db.prepare('INSERT OR REPLACE INTO assets VALUES (' +
      '@asset_id, @symbol, @name, @icon_url, @balance, @public_key, @price_btc, @price_usd, @chain_id, @change_usd, @change_btc, @hidden, @confirmations, @account_name, @account_tag)')
    stmt.run(asset)
  }

  getAssets() {
    return db.prepare('SELECT * FROM assets').all()
  }
  getAssetById(assetId) {
    return db.prepare(`SELECT symbol, icon_url
        FROM assets WHERE asset_id = ?`).all(assetId)
  }
}

export default new AssetDao()
