-- CreateEnum
CREATE TYPE "BlockDays" AS ENUM ('EVERYDAY', 'WEEKDAYS', 'WEEKENDS');

-- AlterTable
ALTER TABLE "DailyTask" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "startTime" INTEGER;

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "reason" TEXT;

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arcId" TEXT NOT NULL,
    "days" "BlockDays" NOT NULL DEFAULT 'EVERYDAY',
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeBlock_arcId_idx" ON "TimeBlock"("arcId");

-- CreateIndex
CREATE INDEX "TimeBlock_userId_idx" ON "TimeBlock"("userId");

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_arcId_fkey" FOREIGN KEY ("arcId") REFERENCES "Arc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
