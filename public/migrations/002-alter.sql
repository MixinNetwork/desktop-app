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


ALTER TABLE users ADD COLUMN biography TEXT


DROP TRIGGER IF EXISTS `conversation_unseen_message_count_update`;
DROP TABLE IF EXISTS `resend_messages`;


-- Down
