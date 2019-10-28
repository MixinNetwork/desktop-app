BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS `identities`(
   id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
   address TEXT NOT NULL,
   registration_id INTEGER,
   public_key TEXT,
   private_key TEXT 
);

CREATE UNIQUE INDEX IF NOT EXISTS index_identities_address ON identities ('address');

CREATE TABLE IF NOT EXISTS `prekeys`(
    prekey_id INTEGER PRIMARY KEY,
    record TEXT
);

CREATE TABLE IF NOT EXISTS `signed_prekeys`(
    prekey_id INTEGER PRIMARY KEY,
    record TEXT
);

CREATE TABLE IF NOT EXISTS `sessions`(
    address TEXT NOT NULL,
    device INTEGER NOT NULL,
    record TEXT NOT NULL,
    PRIMARY KEY(address, device)
);

CREATE TABLE IF NOT EXISTS `sender_keys`(
    group_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    record TEXT NOT NULL,
    PRIMARY KEY(group_id, sender_id)
);
COMMIT;