import db from '@/persistence/db'

class AppDao {
  insert(app) {
    if (!app) return
    app.capabilites = JSON.stringify(app.capabilites)
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO apps VALUES (@app_id, @app_number, @home_uri, @redirect_uri, @name, @icon_url, @description, @app_secret, @capabilites, @creator_id)'
    )
    stmt.run(app)
  }

  findAppByUserId(id) {
    if (!id) return null
    return db.prepare('SELECT * FROM apps WHERE app_id = ?').get([id])
  }
}

export default new AppDao()
