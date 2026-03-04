-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "support_tickets" ADD COLUMN "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "support_tickets_is_archived_idx" ON "support_tickets"("is_archived");
