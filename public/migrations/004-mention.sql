-- Up
CREATE TABLE IF NOT EXISTS `message_mentions` (
	`message_id`	TEXT NOT NULL,
	`conversation_id`	TEXT NOT NULL,
	`mentions`	TEXT NOT NULL,
	`has_read`	INTEGER,
	PRIMARY KEY(`message_id`)
);

CREATE INDEX IF NOT EXISTS `index_message_mentions_conversation_id` ON `message_mentions` (
	`conversation_id`
);

-- Down


