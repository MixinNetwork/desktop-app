-- Up
CREATE TABLE IF NOT EXISTS `circles` (
    `circle_id` TEXT NOT NULL,
    `name` TEXT NOT NULL,
    `created_at` TEXT NOT NULL,
    `order_at` TEXT,
    PRIMARY KEY(`circle_id`)
);

CREATE TABLE IF NOT EXISTS `circle_conversations` (
    `conversation_id` TEXT NOT NULL,
    `circle_id` TEXT NOT NULL,
    `created_at` TEXT NOT NULL,
    `pin_time` TEXT,
    PRIMARY KEY(`conversation_id`, `circle_id`)
);

-- Down
