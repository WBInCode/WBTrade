-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('SHIPPING', 'BILLING');

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "label" TEXT,
ADD COLUMN     "type" "AddressType" NOT NULL DEFAULT 'SHIPPING';

-- CreateIndex
CREATE INDEX "addresses_user_id_type_idx" ON "addresses"("user_id", "type");
