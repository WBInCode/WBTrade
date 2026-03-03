-- AlterTable
ALTER TABLE "reviews" ADD COLUMN "admin_reply" TEXT;
ALTER TABLE "reviews" ADD COLUMN "admin_reply_at" TIMESTAMP(3);
ALTER TABLE "reviews" ADD COLUMN "admin_reply_by" TEXT;
