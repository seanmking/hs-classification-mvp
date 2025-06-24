CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`classification_id` text NOT NULL,
	`action` text NOT NULL,
	`actor` text NOT NULL,
	`details` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`hash` text NOT NULL,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`classification_id`) REFERENCES `classifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`classification_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`classification_id`) REFERENCES `classifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `classification_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`classification_id` text NOT NULL,
	`step` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`started_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` integer,
	`data` text,
	FOREIGN KEY (`classification_id`) REFERENCES `classifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`classification_id` text NOT NULL,
	`step` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`reasoning` text NOT NULL,
	`confidence` real NOT NULL,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`metadata` text,
	FOREIGN KEY (`classification_id`) REFERENCES `classifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`classification_id` text NOT NULL,
	`form_type` text NOT NULL,
	`data` text NOT NULL,
	`submitted_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`classification_id`) REFERENCES `classifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hs_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`level` text NOT NULL,
	`parent_code` text,
	`notes` text,
	`exclusions` text
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`classification_id` text NOT NULL,
	`name` text NOT NULL,
	`percentage` real NOT NULL,
	`hs_code` text,
	`description` text,
	`determination_method` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`classification_id`) REFERENCES `classifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`name` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);