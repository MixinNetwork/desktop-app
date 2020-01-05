-- Up
CREATE TABLE `apps_backup` (
	`app_id`	TEXT NOT NULL,
	`app_number`	TEXT NOT NULL,
	`home_uri`	TEXT NOT NULL,
	`redirect_uri`	TEXT NOT NULL,
	`name`	TEXT NOT NULL,
	`icon_url`	TEXT NOT NULL,
	`description`	TEXT NOT NULL,
	`capabilites`	TEXT,
	`creator_id`	TEXT NOT NULL,
	PRIMARY KEY(`app_id`)
);
INSERT INTO `apps_backup` SELECT `app_id`,`app_number`,`home_uri`,`redirect_uri`,`name`,`icon_url`,`description`,`capabilites`,`creator_id` FROM apps;
DROP TABLE IF EXISTS `apps`;
ALTER TABLE `apps_backup` RENAME TO `apps`;


DROP TRIGGER IF EXISTS `conversation_unseen_message_count_insert`;
CREATE TABLE `users_backup` (
	`user_id`	TEXT NOT NULL,
	`identity_number`	TEXT NOT NULL,
	`relationship`	TEXT NOT NULL,
	`full_name`	TEXT,
	`avatar_url`	TEXT,
	`biography`	TEXT,
	`phone`	TEXT,
	`is_verified`	INTEGER,
	`created_at`	TEXT,
	`mute_until`	TEXT,
	`has_pin`	INTEGER,
	`app_id`	TEXT,
	PRIMARY KEY(`user_id`)
);
INSERT INTO `users_backup` SELECT `user_id`,`identity_number`,`relationship`,`full_name`,`avatar_url`,NULL as `biography`,`phone`,`is_verified`,`created_at`,`mute_until`,`has_pin`,`app_id` FROM users;
DROP TABLE IF EXISTS `users`;
ALTER TABLE `users_backup` RENAME TO `users`;
CREATE TRIGGER IF NOT EXISTS conversation_unseen_message_count_insert AFTER INSERT ON messages BEGIN UPDATE conversations SET unseen_message_count = (SELECT count(m.message_id) FROM messages m, users u WHERE m.user_id = u.user_id AND u.relationship != 'ME' AND m.status = 'SENT' AND conversation_id = new.conversation_id) where conversation_id = new.conversation_id; END;


DROP TRIGGER IF EXISTS `conversation_unseen_message_count_update`;
DROP TABLE IF EXISTS `resend_messages`;


-- Down
