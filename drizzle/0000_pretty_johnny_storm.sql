CREATE TABLE `backups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`actor` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor` text NOT NULL,
	`occurred_at` text NOT NULL,
	`date` text NOT NULL,
	`before_qty` integer,
	`after_qty` integer,
	`delta` integer,
	`student_name` text DEFAULT '' NOT NULL,
	`student_class` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'app' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_user_id_unique` ON `members` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`low_limit` integer DEFAULT 5 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock` (
	`key` text PRIMARY KEY NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_change` text
);
