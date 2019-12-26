BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS `users` (
	`user_id`	TEXT NOT NULL,
	`identity_number`	TEXT NOT NULL,
	`relationship`	TEXT NOT NULL,
	`full_name`	TEXT,
	`avatar_url`	TEXT,
	`phone`	TEXT,
	`is_verified`	INTEGER,
	`created_at`	TEXT,
	`mute_until`	TEXT,
	`has_pin`	INTEGER,
	`app_id`	TEXT,
	PRIMARY KEY(`user_id`)
);
CREATE TABLE IF NOT EXISTS `stickers` (
	`sticker_id`	TEXT NOT NULL,
	`album_id`	TEXT,
	`name`	TEXT NOT NULL,
	`asset_url`	TEXT NOT NULL,
	`asset_type`	TEXT NOT NULL,
	`asset_width`	INTEGER NOT NULL,
	`asset_height`	INTEGER NOT NULL,
	`created_at`	TEXT NOT NULL,
	`last_use_at`	TEXT,
	PRIMARY KEY(`sticker_id`)
);
CREATE TABLE IF NOT EXISTS `sticker_relationships` (
	`album_id`	TEXT NOT NULL,
	`sticker_id`	TEXT NOT NULL,
	PRIMARY KEY(`album_id`,`sticker_id`)
);
CREATE TABLE IF NOT EXISTS `sticker_albums` (
	`album_id`	TEXT NOT NULL,
	`name`	TEXT NOT NULL,
	`icon_url`	TEXT NOT NULL,
	`created_at`	TEXT NOT NULL,
	`update_at`	TEXT NOT NULL,
	`user_id`	TEXT NOT NULL,
	`category`	TEXT NOT NULL,
	`description`	TEXT NOT NULL,
	PRIMARY KEY(`album_id`)
);
CREATE TABLE IF NOT EXISTS `snapshots` (
	`snapshot_id`	TEXT NOT NULL,
	`type`	TEXT NOT NULL,
	`asset_id`	TEXT NOT NULL,
	`amount`	TEXT NOT NULL,
	`created_at`	TEXT NOT NULL,
	`opponent_id`	TEXT,
	`transaction_hash`	TEXT,
	`sender`	TEXT,
	`receiver`	TEXT,
	`memo`	TEXT,
	`confirmations`	INTEGER,
	PRIMARY KEY(`snapshot_id`)
);
CREATE TABLE IF NOT EXISTS `sent_session_sender_keys` (
	`conversation_id`	TEXT NOT NULL,
	`user_id`	TEXT NOT NULL,
	`session_id` TEXT NOT NULL,
	`sent_to_server`	INTEGER NOT NULL,
	`sender_key_id`	INTEGER,
	`created_at`	TEXT,
	PRIMARY KEY(`conversation_id`,`user_id`, `session_id`)
);
CREATE TABLE IF NOT EXISTS `resend_session_messages` (
	`message_id` TEXT NOT NULL, 
	`user_id` TEXT NOT NULL, 
	`session_id` TEXT NOT NULL, 
	`status` INTEGER NOT NULL, 
	`created_at` TEXT NOT NULL, 
	PRIMARY KEY(`message_id`, `user_id`, `session_id`)
);
CREATE TABLE IF NOT EXISTS `participants` (
	`conversation_id`	TEXT NOT NULL,
	`user_id`	TEXT NOT NULL,
	`role`	TEXT NOT NULL,
	`created_at`	TEXT NOT NULL,
	PRIMARY KEY(`conversation_id`,`user_id`),
	FOREIGN KEY(`conversation_id`) REFERENCES `conversations`(`conversation_id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS `offsets` (
	`key`	TEXT NOT NULL,
	`timestamp`	TEXT NOT NULL,
	PRIMARY KEY(`key`)
);
CREATE TABLE IF NOT EXISTS `messages_history` (
	`message_id`	TEXT NOT NULL,
	PRIMARY KEY(`message_id`)
);
CREATE TABLE IF NOT EXISTS `messages` (
	`message_id`	TEXT NOT NULL,
	`conversation_id`	TEXT NOT NULL,
	`user_id`	TEXT NOT NULL,
	`category`	TEXT NOT NULL,
	`content`	TEXT,
	`media_url`	TEXT,
	`media_mime_type`	TEXT,
	`media_size`	INTEGER,
	`media_duration`	TEXT,
	`media_width`	INTEGER,
	`media_height`	INTEGER,
	`media_hash`	TEXT,
	`thumb_image`	TEXT,
	`media_key`	    TEXT,
	`media_digest`	TEXT,
	`media_status`	TEXT,
	`status`	TEXT NOT NULL,
	`created_at`	TEXT NOT NULL,
	`action`	TEXT,
	`participant_id`	TEXT,
	`snapshot_id`	TEXT,
	`hyperlink`	TEXT,
	`name`	TEXT,
	`album_id`	TEXT,
	`sticker_id`	TEXT,
	`shared_user_id`	TEXT,
	`media_waveform`	TEXT,
	`quote_message_id`	TEXT,
	`quote_content`	TEXT,
	`thumb_url`     TEXT,
	PRIMARY KEY(`message_id`),
	FOREIGN KEY(`conversation_id`) REFERENCES `conversations`(`conversation_id`) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS `messages_fts` USING FTS5(`message_id` UNINDEXED, `content`, tokenize='unicode61');

CREATE TABLE IF NOT EXISTS `jobs` (
	`job_id`	TEXT NOT NULL,
	`action`	TEXT NOT NULL,
	`created_at`	TEXT NOT NULL,
	`order_id`	INTEGER,
	`priority`	INTEGER NOT NULL,
	`user_id`	TEXT,
	`blaze_message`	TEXT,
	`conversation_id`	TEXT,
	`resend_message_id`	TEXT,
	`run_count`	INTEGER NOT NULL,
	PRIMARY KEY(`job_id`)
);
CREATE TABLE IF NOT EXISTS `hyperlinks` (
	`hyperlink`	TEXT NOT NULL,
	`site_name`	TEXT NOT NULL,
	`site_title`	TEXT NOT NULL,
	`site_description`	TEXT,
	`site_image`	TEXT,
	PRIMARY KEY(`hyperlink`)
);
CREATE TABLE IF NOT EXISTS `flood_messages` (
	`message_id`	TEXT NOT NULL,
	`data`	TEXT NOT NULL,
	`created_at`	TEXT NOT NULL,
	PRIMARY KEY(`message_id`)
);
CREATE TABLE IF NOT EXISTS `conversations` (
	`conversation_id`	TEXT NOT NULL,
	`owner_id`	TEXT,
	`category`	TEXT,
	`name`	TEXT,
	`icon_url`	TEXT,
	`announcement`	TEXT,
	`code_url`	TEXT,
	`pay_type`	TEXT,
	`created_at`	TEXT NOT NULL,
	`pin_time`	TEXT,
	`last_message_id`	TEXT,
	`last_read_message_id`	TEXT,
	`unseen_message_count`	INTEGER,
	`status`	INTEGER NOT NULL,
	`draft`	TEXT,
	`mute_until`	TEXT,
	PRIMARY KEY(`conversation_id`)
);
CREATE TABLE IF NOT EXISTS `assets` (
	`asset_id`	TEXT NOT NULL,
	`symbol`	TEXT NOT NULL,
	`name`	TEXT NOT NULL,
	`icon_url`	TEXT NOT NULL,
	`balance`	TEXT NOT NULL,
	`destination`	TEXT NOT NULL,
	`tag`	TEXT,
	`price_btc`	TEXT NOT NULL,
	`price_usd`	TEXT NOT NULL,
	`chain_id`	TEXT NOT NULL,
	`change_usd`	TEXT NOT NULL,
	`change_btc`	TEXT NOT NULL,
	`confirmations`	INTEGER NOT NULL,
	`asset_key`	TEXT,
	PRIMARY KEY(`asset_id`)
);
CREATE TABLE IF NOT EXISTS `apps` (
	`app_id`	TEXT NOT NULL,
	`app_number`	TEXT NOT NULL,
	`home_uri`	TEXT NOT NULL,
	`redirect_uri`	TEXT NOT NULL,
	`name`	TEXT NOT NULL,
	`icon_url`	TEXT NOT NULL,
	`description`	TEXT NOT NULL,
	`app_secret`	TEXT NOT NULL,
	`capabilites`	TEXT,
	`creator_id`	TEXT NOT NULL,
	PRIMARY KEY(`app_id`)
);
CREATE TABLE IF NOT EXISTS `addresses` (
	`address_id`	TEXT NOT NULL,
	`type`	TEXT NOT NULL,
	`asset_id`	TEXT NOT NULL,
	`public_key`	TEXT,
	`label`	TEXT,
	`updated_at`	TEXT NOT NULL,
	`reserve`	TEXT NOT NULL,
	`fee`	TEXT NOT NULL,
	`account_name`	TEXT,
	`account_tag`	TEXT,
	`dust`	TEXT,
	PRIMARY KEY(`address_id`)
);

CREATE TABLE IF NOT EXISTS `ratchet_sender_keys` (
	`group_id` TEXT NOT NULL, 
	`sender_id` TEXT NOT NULL, 
	`status` TEXT NOT NULL, 
	`message_id` TEXT, 
	`created_at` TEXT NOT NULL, 
	PRIMARY KEY(`group_id`, `sender_id`)
);

CREATE TABLE IF NOT EXISTS `participant_session` (
	`conversation_id` TEXT NOT NULL, 
	`user_id` TEXT NOT NULL, 
	`session_id` TEXT NOT NULL, 
	`sent_to_server` INTEGER, 
	`created_at` TEXT, 
	PRIMARY KEY(`conversation_id`, `user_id`, `session_id`)
);

CREATE INDEX IF NOT EXISTS `index_users_full_name` ON `users` (
	`full_name`
);
CREATE INDEX IF NOT EXISTS `index_participants_created_at` ON `participants` (
	`created_at`
);
CREATE INDEX IF NOT EXISTS `index_participants_conversation_id` ON `participants` (
	`conversation_id`
);
CREATE INDEX IF NOT EXISTS `index_messages_user_id` ON `messages` (
	`user_id`
);
CREATE INDEX IF NOT EXISTS `index_messages_conversation_id_user_id_status_created_at` ON `messages` (
	`conversation_id`,
	`user_id`,
	`status`,
	`created_at`
);
CREATE INDEX IF NOT EXISTS `index_messages_conversation_id_created_at` ON `messages` (
	`conversation_id`,
	`created_at`
);
CREATE INDEX IF NOT EXISTS `index_conversations_created_at` ON `conversations` (
	`created_at`
);
CREATE UNIQUE INDEX IF NOT EXISTS `index_conversations_conversation_id` ON `conversations` (
	`conversation_id`
);
CREATE TRIGGER IF NOT EXISTS conversation_unseen_message_count_update AFTER UPDATE ON messages BEGIN UPDATE conversations SET unseen_message_count = (SELECT count(m.message_id) FROM messages m, users u WHERE m.user_id = u.user_id AND u.relationship != 'ME' AND m.status = 'SENT' AND conversation_id = new.conversation_id) where conversation_id = new.conversation_id; END;
CREATE TRIGGER IF NOT EXISTS conversation_unseen_message_count_insert AFTER INSERT ON messages BEGIN UPDATE conversations SET unseen_message_count = (SELECT count(m.message_id) FROM messages m, users u WHERE m.user_id = u.user_id AND u.relationship != 'ME' AND m.status = 'SENT' AND conversation_id = new.conversation_id) where conversation_id = new.conversation_id; END;
CREATE TRIGGER IF NOT EXISTS conversation_last_message_update AFTER INSERT ON messages BEGIN UPDATE conversations SET last_message_id = new.message_id WHERE conversation_id = new.conversation_id; END;
CREATE TRIGGER IF NOT EXISTS conversation_last_message_delete AFTER DELETE ON messages BEGIN UPDATE conversations SET last_message_id = (select message_id from messages where conversation_id = old.conversation_id order by created_at DESC limit 1) WHERE conversation_id = old.conversation_id; END;

CREATE TRIGGER IF NOT EXISTS messages_fts_BEFORE_UPDATE BEFORE UPDATE ON messages BEGIN DELETE FROM messages_fts WHERE `message_id`=OLD.`message_id`; END;
CREATE TRIGGER IF NOT EXISTS messages_fts_BEFORE_DELETE BEFORE DELETE ON messages BEGIN DELETE FROM messages_fts WHERE `message_id`=OLD.`message_id`; END;
CREATE TRIGGER IF NOT EXISTS messages_fts_AFTER_UPDATE AFTER UPDATE ON messages BEGIN INSERT INTO messages_fts(`message_id`, `content`) VALUES (NEW.`message_id`, NEW.`content`); END;
CREATE TRIGGER IF NOT EXISTS messages_fts_AFTER_INSERT AFTER INSERT ON messages BEGIN INSERT INTO messages_fts(`message_id`, `content`) VALUES (NEW.`message_id`, NEW.`content`); END;
COMMIT;

