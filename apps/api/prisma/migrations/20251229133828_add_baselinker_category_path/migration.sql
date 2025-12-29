-- AlterTable
ALTER TABLE "baselinker_configs" ADD COLUMN     "sync_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sync_interval_minutes" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "baselinker_category_path" TEXT;
