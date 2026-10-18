ALTER TABLE `history` ADD `edited_at` text;--> statement-breakpoint
ALTER TABLE `history` ADD `edit_log` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
DROP TRIGGER audit_update_guard;
--> statement-breakpoint
CREATE TRIGGER audit_update_guard BEFORE UPDATE ON history WHEN NEW.id != OLD.id OR NEW.key IS NOT OLD.key OR NEW.action != OLD.action OR NEW.actor_id != OLD.actor_id OR NEW.actor != OLD.actor OR NEW.occurred_at != OLD.occurred_at OR NEW.before_qty IS NOT OLD.before_qty OR NEW.after_qty IS NOT OLD.after_qty OR NEW.delta IS NOT OLD.delta OR NEW.source != OLD.source OR NEW.action NOT IN ('Masuk','Keluar','Penyesuaian') OR NEW.edited_at IS NULL OR json_array_length(NEW.edit_log) <= json_array_length(OLD.edit_log) BEGIN SELECT RAISE(ABORT, 'audit is immutable'); END;
