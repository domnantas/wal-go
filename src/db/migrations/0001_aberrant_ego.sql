ALTER TABLE "qsos" DROP CONSTRAINT "qsos_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "qsos" ADD CONSTRAINT "qsos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;