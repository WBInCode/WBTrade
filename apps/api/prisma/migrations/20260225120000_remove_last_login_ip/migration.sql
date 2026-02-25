-- AlterTable: Remove last_login_ip column from users (already removed in production)
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_ip";
