-- Up
CREATE TABLE IF NOT EXISTS `message_mentions` (
	`message_id`	TEXT NOT NULL,
	`conversation_id`	TEXT NOT NULL,
	`mentions`	TEXT NOT NULL,
	`has_read`	INTEGER,
	PRIMARY KEY(`message_id`)
);

-- Down


