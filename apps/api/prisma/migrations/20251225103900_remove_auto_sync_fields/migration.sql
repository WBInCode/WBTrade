/*
  Warnings:

  - You are about to drop the column `stock_sync_interval_minutes` on the `baselinker_configs` table. All the data in the column will be lost.
  - You are about to drop the column `sync_enabled` on the `baselinker_configs` table. All the data in the column will be lost.
  - You are about to drop the column `sync_interval_minutes` on the `baselinker_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "baselinker_configs" DROP COLUMN "stock_sync_interval_minutes",
DROP COLUMN "sync_enabled",
DROP COLUMN "sync_interval_minutes";
