-- Up
CREATE TABLE `messages_mention` (
	`conversation_id`	TEXT NOT NULL,
	`message_id`	TEXT NOT NULL,
	`mentions`	TEXT NOT NULL,
	`has_read`	INTEGER,
	PRIMARY KEY(`conversation_id`, `message_id`)
);

ALTER TABLE conversations ADD COLUMN unseen_mention_count INTEGER;

-- Down

