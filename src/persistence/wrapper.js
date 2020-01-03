// The MIT License (MIT)

// Copyright (c) 2018 Markus Madeja

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { getDbPath } from './db_util'

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')
const appRoot = getDbPath()

const dbFile = path.resolve(appRoot, './data/sqlite3.db')

let instance = null

/**
 * Class to control database-connections
 *
 * @returns {DB}
 * @constructor
 */
function DB(options = {}) {
  if (!(this instanceof DB)) {
    instance = instance || new DB(...arguments)
    return instance
  }
  this.options = Object.assign(
    {
      path: dbFile,
      migrate: true,
      memory: false,
      readonly: false,
      fileMustExist: false,
      WAL: true
    },
    options
  )
  // use memory when path is the string ':memory:'
  this.options.memory = options.memory === undefined ? options.path === ':memory:' : options.memory

  /**
   * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#properties
   */
  Object.defineProperty(this, 'open', {
    get: function() {
      return this.connection().open
    }
  })
  Object.defineProperty(this, 'inTransaction', {
    get: function() {
      return this.connection().inTransaction
    }
  })
  Object.defineProperty(this, 'name', {
    get: function() {
      return this.connection().name
    }
  })
  Object.defineProperty(this, 'memory', {
    get: function() {
      return this.connection().memory
    }
  })
  Object.defineProperty(this, 'readonly', {
    get: function() {
      return this.connection().readonly
    }
  })
  /**
   * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#transactionfunction---function
   */
  Object.defineProperty(this, 'transaction', {
    get: function() {
      return this.connection().transaction
    }
  })
}

/**
 * Will (create and) return the Better-Sqlite3-Database-Object
 * @returns {Database}
 */
DB.prototype.connection = function() {
  if (this.db) {
    return this.db
  }
  try {
    // create path if it doesn't exists
    mkdirp.sync(path.dirname(this.options.path))
    this.db = new Database(this.options.path, {
      memory: this.options.memory,
      readonly: this.options.readonly,
      fileMustExist: this.options.fileMustExist
    })
  } catch (e) {
    this.db = undefined
    throw e
  }
  if (this.options.WAL) {
    this.db.pragma('journal_mode = WAL')
  }
  if (this.options.migrate) {
    this.migrate(typeof this.options.migrate === 'object' ? this.options.migrate : {})
  }
  return this.db
}

/**
 * Creates a new prepared Statement from the given SQL string.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#preparestring---statement
 *
 * @param {String} sql the sql
 * @returns {Statement}
 */
DB.prototype.prepare = function(sql) {
  return this.connection().prepare(sql)
}

/**
 * Executes the given SQL string. Unlike prepared statements, this can execute strings that contain multiple SQL statements.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#execstring---this
 *
 * @param {String} sqls the sql(s)
 * @returns {this}
 */
DB.prototype.exec = function(sqls) {
  this.connection().exec(sqls)
  return this
}

/**
 * Executes the given PRAGMA and returns its result.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#pragmastring-options---results
 *
 * @param {String} string the statement
 * @param {Object} options the options
 * @returns {Array|String|Integer} Result
 */
DB.prototype.pragma = function(string, options = {}) {
  return this.connection().pragma(string, options)
}

/**
 * Runs a WAL mode checkpoint on all attached databases.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#checkpointdatabasename---this
 *
 * @param {String} databaseName Name of the Database
 * @returns {this}
 */
DB.prototype.checkpoint = function(...args) {
  this.connection().checkpoint(...args)
  return this
}

/**
 * By default, integers returned from the database (including the info.lastInsertRowid property) are normal JavaScript numbers.
 * You can change this default as you please.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/integer.md#getting-integers-from-the-database
 *
 * @param {Boolean} bool enable safe Integers
 * @returns {this}
 */
DB.prototype.defaultSafeIntegers = function(toggleState = true) {
  this.connection().defaultSafeIntegers(toggleState)
  return this
}

/**
 * Loads a compiled SQLite3 extension and applies it to the current database connection.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#loadextensionpath---this
 *
 * @param {String} path Path of the extention
 * @returns {this}
 */
DB.prototype.loadExtension = function(...args) {
  this.connection().loadExtension(...args)
  return this
}

/**
 * Registers a user-defined function so that it can be used by SQL statements.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#functionname-options-function---this
 *
 * @param {String} name
 * @param {Object} options
 * @param {function} callback
 * @returns {this}
 */
DB.prototype.function = function(...args) {
  this.connection().function(...args)
  return this
}

/**
 * Registers a user-defined aggregate function.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#aggregatename-options---this
 *
 * @param {String} name
 * @param {Object} options
 * @returns {this}
 */
DB.prototype.aggregate = function(...args) {
  this.connection().aggregate(...args)
  return this
}

/**
 * Initiates a backup of the database, returning a promise for when the backup is complete.
 * No destination name creates a `sqlite3-bak-${Date.now()}.db`-File in the default data directory.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#backupdestination-options---promise
 *
 * @param {String} destination Path of the extention
 * @param {Object} options the options
 * @returns {Promise}
 */
DB.prototype.backup = function(destination, options = {}) {
  return this.connection().backup(destination || path.resolve(appRoot, `./data/sqlite3-bak-${Date.now()}.db`), options)
}

/**
 * Closes the database connection.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#close---this
 *
 * @returns {this}
 */
DB.prototype.close = function() {
  if (this.db) {
    this.db.close()
    this.db = undefined
    if (this === instance) instance = null
  }
  return this
}

/**
 * Executes the prepared statement. When execution completes it returns an info object describing any changes made. The info object has two properties:
 *
 * info.changes: The total number of rows that were inserted, updated, or deleted by this operation. Changes made by foreign key actions or trigger programs do not count.
 * info.lastInsertRowid: The rowid of the last row inserted into the database (ignoring those caused by trigger programs). If the current statement did not insert any rows into the database, this number should be completely ignored.
 *
 * If execution of the statement fails, an Error is thrown.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#runbindparameters---object
 *
 * @param {String} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {*} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {*}
 */
DB.prototype.run = function(query, ...bindParameters) {
  return this.connection()
    .prepare(query)
    .run(...bindParameters)
}

/**
 * Returns all values of a query
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#allbindparameters---array-of-rows
 *
 * @param {String} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {*} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {Array}
 */
DB.prototype.query = function(query, ...bindParameters) {
  return this.connection()
    .prepare(query)
    .all(...bindParameters)
}

/**
 * Similar to .query(), but instead of returning every row together, an iterator is returned so you can retrieve the rows one by one.
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#iteratebindparameters---iterator
 *
 * @param {String} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {*} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#binding-parameters
 * @returns {Iterator}
 */
DB.prototype.queryIterate = function(query, ...bindParameters) {
  return this.connection()
    .prepare(query)
    .iterate(...bindParameters)
}

/**
 * Returns the values of the first row of the query-result
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#getbindparameters---row
 *
 * @param {String} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {*} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#binding-parameters
 * @returns {Object|undefined}
 */
DB.prototype.queryFirstRow = function(query, ...bindParameters) {
  return this.connection()
    .prepare(query)
    .get(...bindParameters)
}

/**
 * Returns the values of the first row of the query-result
 * @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#getbindparameters---row
 * It returns always an object and thus can be used with destructuring assignment
 *
 * @example const {id, name} = DB().queryFirstRowObject(sql)
 * @param {String} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {*} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#binding-parameters
 * @returns {Object}
 */
DB.prototype.queryFirstRowObject = function(query, ...bindParameters) {
  return (
    this.connection()
      .prepare(query)
      .get(...bindParameters) || {}
  )
}

/**
 * Returns the value of the first column in the first row of the query-result
 *
 * @param {String} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {*} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#binding-parameters
 * @returns {*}
 */
DB.prototype.queryFirstCell = function(query, ...bindParameters) {
  return this.connection()
    .prepare(query)
    .pluck(true)
    .get(...bindParameters)
}

/**
 * Returns an Array that only contains the values of the specified column
 *
 * @param {String} column Name of the column
 * @param {String} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {*} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#binding-parameters
 * @returns {Array}
 */
DB.prototype.queryColumn = function(column, query, ...bindParameters) {
  return this.query(query, ...bindParameters).map(v => v[column])
}

/**
 * Returns a Object that get it key-value-combination from the result of the query
 *
 * @param {String} key Name of the column that values should be the key
 * @param {String} column Name of the column that values should be the value for the object
 * @param {String} query the SQL-Query that should be run. Can contain placeholders for bind parameters.
 * @param {*} bindParameters You can specify bind parameters @see https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#binding-parameters
 * @returns {object}
 */
DB.prototype.queryKeyAndColumn = function(key, column, query, ...bindParameters) {
  return this.query(query, ...bindParameters).reduce((cur, v) => {
    cur[v[key]] = v[column]
    return cur
  }, {})
}

/**
 * Create an update statement; create more complex one with exec yourself.
 *
 * @param {String} table required. Name of the table
 * @param {Object} data A Object of data to set. Key is the name of the column. Value 'undefined' is filtered
 * @param {String|Array|Object} where required. array with a string and the replacements for ? after that. F.e. ['id > ? && name = ?', id, name]. Or an object with key values. F.e. {id: params.id}. Or simply an ID that will be translated to ['id = ?', id]
 * @param {undefined|Array} whiteList optional List of columns that can only be updated with "data"
 * @returns {Integer} Number of changed rows
 */
DB.prototype.update = function(table, data, where, whiteList) {
  if (!where) {
    throw new Error('Where is missing for the update command of DB()')
  }
  if (!table) {
    throw new Error('Table is missing for the update command of DB()')
  }
  if (typeof data !== 'object' || !Object.keys(data).length) {
    return 0
  }

  // Build start of where query
  let sql = `UPDATE \`${table}\` SET `
  let parameter = []

  // Build data part of the query
  const setStringBuilder = []
  for (const keyOfData in data) {
    const value = data[keyOfData]
    // don't set undefined and only values in an optional whitelist
    if (value !== undefined && (!whiteList || whiteList.includes(keyOfData))) {
      parameter.push(value)
      setStringBuilder.push(`\`${keyOfData}\` = ?`)
    }
  }
  if (!setStringBuilder.length) {
    // nothing to update
    return 0
  }
  sql += setStringBuilder.join(', ')

  // Build where part of query
  sql += ' WHERE '
  if (Array.isArray(where)) {
    const [whereTerm, ...whereParameter] = where
    sql += whereTerm
    parameter = [...parameter, ...whereParameter]
  } else if (typeof where === 'object') {
    const whereStringBuilder = []
    for (const keyOfWhere in where) {
      const value = where[keyOfWhere]
      if (value !== undefined) {
        parameter.push(value)
        whereStringBuilder.push(`\`${keyOfWhere}\` = ?`)
      }
    }
    if (!whereStringBuilder.length) {
      throw new Error('Where is not constructed for the update command of DB()')
    }
    sql += whereStringBuilder.join(' AND ')
  } else {
    sql += 'id = ?'
    parameter.push(where)
  }

  return this.run(sql, ...parameter).changes
}

/**
 * Create an update statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object} data a Object of data to set. Key is the name of the column. Value 'undefined' is filtered
 * @param {String|Array|Object} where required. array with a string and the replacements for ? after that. F.e. ['id > ? && name = ?', id, name]. Or an object with key values. F.e. {id: params.id}. Or simply an ID that will be translated to ['id = ?', id]
 * @param {undefined|Array} whiteBlackList optional List of columns that can not be updated with "data" (blacklist)
 * @returns {Integer} Number of changed rows
 */
DB.prototype.updateWithBlackList = function(table, data, where, blackList) {
  return this.update(table, data, where, createWhiteListByBlackList.bind(this)(table, blackList))
}

/**
 * Create an insert statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
 * @param {undefined|Array} whiteList optional List of columns that only can be updated with "data"
 * @returns {Integer} Last inserted row id
 */
DB.prototype.insert = function(table, data, whiteList) {
  return this.run(...createInsertOrReplaceStatement('INSERT', table, data, whiteList)).lastInsertRowid
}

/**
 * Create an insert statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
 * @param {undefined|Array} whiteBlackList optional List of columns that can not be updated with "data" (blacklist)
 * @returns {Integer} Last inserted row id
 */
DB.prototype.insertWithBlackList = function(table, data, blackList) {
  return this.insert(table, data, createWhiteListByBlackList.bind(this)(table, blackList))
}

/**
 * Create an replace statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
 * @param {undefined|Array} whiteList optional List of columns that only can be updated with "data"
 * @returns {Integer} Last inserted row id
 */
DB.prototype.replace = function(table, data, whiteList) {
  return this.run(...createInsertOrReplaceStatement('REPLACE', table, data, whiteList)).lastInsertRowid
}

/**
 * Create an replace statement; create more complex one with exec yourself.
 *
 * @param {String} table Name of the table
 * @param {Object|Array} data a Object of data to set. Key is the name of the column. Can be an array of objects.
 * @param {undefined|Array} whiteBlackList optional List of columns that can not be updated with "data" (blacklist)
 * @returns {Integer} Last inserted row id
 */
DB.prototype.replaceWithBlackList = function(table, data, blackList) {
  return this.replace(table, data, createWhiteListByBlackList.bind(this)(table, blackList))
}

/**
 * Internal function to create a whitelist from a blacklist
 *
 * @param {String} table
 * @param {Array} blackList
 * @returns {Array} a whitelist
 */
function createWhiteListByBlackList(table, blackList) {
  let whiteList
  if (Array.isArray(blackList)) {
    // get all avaible columns
    whiteList = this.queryColumn('name', `PRAGMA table_info('${table}')`)
    // get only those not in the whiteBlackList
    whiteList = whiteList.filter(v => !blackList.includes(v))
  }
  return whiteList
}

/**
 * Internal function to create the insert or replace statement
 *
 * @param {String} insertOrReplace
 * @param {String} table
 * @param {*} data
 * @param {undefined|Array} whiteList
 * @returns {Array} sql and all parameters
 */
function createInsertOrReplaceStatement(insertOrReplace, table, data, whiteList) {
  if (!table) {
    throw new Error(`Table is missing for the ${insertOrReplace} command of DB()`)
  }
  if (!Array.isArray(data)) {
    data = [data]
  }
  if (typeof data[0] !== 'object') {
    throw new Error(`data does not contain a object`)
  }

  let fields = Object.keys(data[0])

  if (Array.isArray(whiteList)) {
    fields = fields.filter(v => whiteList.includes(v))
  }

  // Build start of where query
  let sql = `${insertOrReplace} INTO \`${table}\` (\`${fields.join('`,`')}\`) VALUES `
  const parameter = []
  let addComma = false

  data.forEach(rowData => {
    addComma && (sql += ',')
    sql += '(' + Array.from({ length: fields.length }, () => '?').join(',') + ')'
    fields.forEach(field => parameter.push(rowData[field]))
    addComma = true
  })
  return [sql, ...parameter]
}

/**
 * Migrates database schema to the latest version
 *
 * @param {Object} options
 */
DB.prototype.migrate = function({ force, table = 'migrations', migrationsPath = './migrations' } = {}) {
  const location = path.resolve(appRoot, migrationsPath)

  // Get the list of migration files, for example:
  //   { id: 1, name: 'initial', filename: '001-initial.sql' }
  //   { id: 2, name: 'feature', fielname: '002-feature.sql' }
  const migrations = fs
    .readdirSync(location)
    .map(x => x.match(/^(\d+).(.*?)\.sql$/))
    .filter(x => x !== null)
    .map(x => ({ id: Number(x[1]), name: x[2], filename: x[0] }))
    .sort((a, b) => Math.sign(a.id - b.id))

  if (!migrations.length) {
    // No migration files found
    return
  }

  // Ge the list of migrations, for example:
  //   { id: 1, name: 'initial', filename: '001-initial.sql', up: ..., down: ... }
  //   { id: 2, name: 'feature', fielname: '002-feature.sql', up: ..., down: ... }
  migrations.map(migration => {
    const filename = path.join(location, migration.filename)
    const data = fs.readFileSync(filename, 'utf-8')
    const [up, down] = data.split(/^--\s+?down\b/im)
    if (!down) {
      const message = `The ${migration.filename} file does not contain '-- Down' separator.`
      throw new Error(message)
    } else {
      migration.up = up.replace(/^-- .*?$/gm, '').trim() // Remove comments
      migration.down = down.trim() // and trim whitespaces
    }
  })

  // Create a database table for migrations meta data if it doesn't exist
  this.exec(`CREATE TABLE IF NOT EXISTS "${table}" (
  id   INTEGER PRIMARY KEY,
  name TEXT    NOT NULL,
  up   TEXT    NOT NULL,
  down TEXT    NOT NULL
)`)

  // Get the list of already applied migrations
  let dbMigrations = this.query(`SELECT id, name, up, down FROM "${table}" ORDER BY id ASC`)

  // Undo migrations that exist only in the database but not in files,
  // also undo the last migration if the `force` option was set to `last`.
  const lastMigration = migrations[migrations.length - 1]
  for (const migration of dbMigrations.slice().sort((a, b) => Math.sign(b.id - a.id))) {
    if (!migrations.some(x => x.id === migration.id) || (force === 'last' && migration.id === lastMigration.id)) {
      this.exec('BEGIN')
      try {
        this.exec(migration.down)
        this.run(`DELETE FROM "${table}" WHERE id = ?`, migration.id)
        this.exec('COMMIT')
        dbMigrations = dbMigrations.filter(x => x.id !== migration.id)
      } catch (err) {
        this.exec('ROLLBACK')
        throw err
      }
    } else {
      break
    }
  }

  // Apply pending migrations
  const lastMigrationId = dbMigrations.length ? dbMigrations[dbMigrations.length - 1].id : 0
  for (const migration of migrations) {
    if (migration.id > lastMigrationId) {
      this.exec('BEGIN')
      try {
        this.exec(migration.up)
        this.run(
          `INSERT INTO "${table}" (id, name, up, down) VALUES (?, ?, ?, ?)`,
          migration.id,
          migration.name,
          migration.up,
          migration.down
        )
        this.exec('COMMIT')
      } catch (err) {
        this.exec('ROLLBACK')
        throw err
      }
    }
  }

  return this
}

export default DB
