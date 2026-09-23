CREATE TABLE `task_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`context` text NOT NULL,
	`need` text NOT NULL,
	`users` text NOT NULL,
	`data` text NOT NULL,
	`constraints` text NOT NULL,
	`expected_result` text NOT NULL,
	`success_criteria` text NOT NULL,
	`contact` text NOT NULL,
	`interaction_format` text NOT NULL,
	`topic` text NOT NULL,
	`score` integer NOT NULL,
	`readiness_level` text NOT NULL,
	`score_breakdown` text NOT NULL,
	`missing_fields` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`contact` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`team_id` text NOT NULL,
	`solution_idea` text NOT NULL,
	`plan` text NOT NULL,
	`timeline` text NOT NULL,
	`prototype_url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `task_cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
