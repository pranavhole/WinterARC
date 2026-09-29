-- AlterEnum
ALTER TYPE "HabitCategory" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "Arc" ADD COLUMN     "dsaGoal" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "focusGoalWeekday" DOUBLE PRECISION NOT NULL DEFAULT 2,
ADD COLUMN     "focusGoalWeekend" DOUBLE PRECISION NOT NULL DEFAULT 2,
ADD COLUMN     "focusKind" TEXT,
ADD COLUMN     "modules" JSONB NOT NULL DEFAULT '{"sleep":true,"tasks":true,"journal":true}',
ADD COLUMN     "sleepGoal" DOUBLE PRECISION NOT NULL DEFAULT 7.5,
ADD COLUMN     "stepGoal" INTEGER NOT NULL DEFAULT 10000;

-- CreateTable
CREATE TABLE "DailyRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arcId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER,
    "weight" DOUBLE PRECISION,
    "studyHours" DOUBLE PRECISION,
    "dsaProblems" INTEGER,
    "bedtime" INTEGER,
    "wakeTime" INTEGER,
    "sleepQuality" INTEGER,
    "journal" TEXT,
    "stepGoal" INTEGER,
    "sleepGoal" DOUBLE PRECISION,
    "focusGoal" DOUBLE PRECISION,
    "dsaGoal" INTEGER,
    "trackTasks" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arcId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "carriedFromId" TEXT,
    "carriedTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyRecord_userId_date_idx" ON "DailyRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecord_arcId_date_key" ON "DailyRecord"("arcId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTask_carriedFromId_key" ON "DailyTask"("carriedFromId");

-- CreateIndex
CREATE INDEX "DailyTask_arcId_date_idx" ON "DailyTask"("arcId", "date");

-- CreateIndex
CREATE INDEX "DailyTask_userId_idx" ON "DailyTask"("userId");

-- AddForeignKey
ALTER TABLE "DailyRecord" ADD CONSTRAINT "DailyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRecord" ADD CONSTRAINT "DailyRecord_arcId_fkey" FOREIGN KEY ("arcId") REFERENCES "Arc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_arcId_fkey" FOREIGN KEY ("arcId") REFERENCES "Arc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
