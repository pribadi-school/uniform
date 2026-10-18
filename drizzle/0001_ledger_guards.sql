CREATE TRIGGER stock_insert_guard BEFORE INSERT ON stock WHEN NEW.quantity < 0 OR NEW.quantity > 1000000 OR typeof(NEW.quantity) != 'integer' BEGIN SELECT RAISE(ABORT, 'invalid stock quantity'); END;
--> statement-breakpoint
CREATE TRIGGER stock_update_guard BEFORE UPDATE ON stock WHEN NEW.quantity < 0 OR NEW.quantity > 1000000 OR typeof(NEW.quantity) != 'integer' BEGIN SELECT RAISE(ABORT, 'invalid stock quantity'); END;
--> statement-breakpoint
CREATE TRIGGER last_admin_guard BEFORE UPDATE ON members WHEN OLD.role='admin' AND OLD.active=1 AND (NEW.role!='admin' OR NEW.active=0) AND (SELECT count(*) FROM members WHERE role='admin' AND active=1)<=1 BEGIN SELECT RAISE(ABORT, 'last active administrator'); END;
--> statement-breakpoint
CREATE TRIGGER audit_update_guard BEFORE UPDATE ON history BEGIN SELECT RAISE(ABORT, 'audit is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER audit_delete_guard BEFORE DELETE ON history BEGIN SELECT RAISE(ABORT, 'audit is immutable'); END;
--> statement-breakpoint
CREATE INDEX history_date_idx ON history(date, occurred_at);
