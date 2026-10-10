-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "actions_taken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "actionDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "result" TEXT,
    "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
    "performedById" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "isFollowUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actions_taken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "actions_taken_ticketId_idx" ON "actions_taken"("ticketId");

-- CreateIndex
CREATE INDEX "actions_taken_performedById_idx" ON "actions_taken"("performedById");

-- CreateIndex
CREATE INDEX "actions_taken_assigneeId_idx" ON "actions_taken"("assigneeId");

-- CreateIndex
CREATE INDEX "actions_taken_status_idx" ON "actions_taken"("status");

-- CreateIndex
CREATE INDEX "actions_taken_actionDateTime_idx" ON "actions_taken"("actionDateTime");

-- AddForeignKey
ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
