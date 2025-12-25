-- AlterTable
ALTER TABLE "baselinker_configs" ADD COLUMN     "stock_sync_interval_minutes" INTEGER NOT NULL DEFAULT 60,
ALTER COLUMN "sync_interval_minutes" SET DEFAULT 1440;
