/*
  Warnings:

  - You are about to drop the column `version` on the `inventory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[baselinker_category_id]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[baselinker_variant_id]` on the table `product_variants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[baselinker_product_id]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BaselinkerSyncType" AS ENUM ('PRODUCTS', 'CATEGORIES', 'STOCK', 'IMAGES');

-- CreateEnum
CREATE TYPE "BaselinkerSyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "baselinker_category_id" TEXT;

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "version";

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "baselinker_variant_id" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "baselinker_product_id" TEXT;

-- CreateTable
CREATE TABLE "baselinker_configs" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "api_token_encrypted" TEXT NOT NULL,
    "encryption_iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sync_interval_minutes" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baselinker_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baselinker_sync_logs" (
    "id" TEXT NOT NULL,
    "type" "BaselinkerSyncType" NOT NULL,
    "status" "BaselinkerSyncStatus" NOT NULL,
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "baselinker_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "baselinker_configs_inventory_id_key" ON "baselinker_configs"("inventory_id");

-- CreateIndex
CREATE INDEX "baselinker_sync_logs_type_idx" ON "baselinker_sync_logs"("type");

-- CreateIndex
CREATE INDEX "baselinker_sync_logs_status_idx" ON "baselinker_sync_logs"("status");

-- CreateIndex
CREATE INDEX "baselinker_sync_logs_started_at_idx" ON "baselinker_sync_logs"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_baselinker_category_id_key" ON "categories"("baselinker_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_baselinker_variant_id_key" ON "product_variants"("baselinker_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_baselinker_product_id_key" ON "products"("baselinker_product_id");
