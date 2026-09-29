-- AlterTable
ALTER TABLE "TimeBlock" ADD COLUMN     "habitId" TEXT;

-- CreateIndex
CREATE INDEX "TimeBlock_habitId_idx" ON "TimeBlock"("habitId");

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
