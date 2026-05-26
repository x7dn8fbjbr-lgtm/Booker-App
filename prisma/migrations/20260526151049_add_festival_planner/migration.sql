/*
  Warnings:

  - You are about to drop the column `artistId` on the `Slot` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Slot` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "endTime" TEXT NOT NULL DEFAULT '22:00',
ADD COLUMN     "gridInterval" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "startTime" TEXT NOT NULL DEFAULT '14:00',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- AlterTable
ALTER TABLE "Slot" DROP COLUMN "artistId",
DROP COLUMN "projectId",
ADD COLUMN     "bookingId" TEXT;

-- AlterTable
ALTER TABLE "Stage" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#6366f1',
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Event_venueId_idx" ON "Event"("venueId");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE INDEX "Slot_stageId_idx" ON "Slot"("stageId");

-- CreateIndex
CREATE INDEX "Slot_bookingId_idx" ON "Slot"("bookingId");

-- CreateIndex
CREATE INDEX "Stage_eventId_idx" ON "Stage"("eventId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
