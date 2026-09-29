-- CreateEnum
CREATE TYPE "HabitIntegration" AS ENUM ('NONE', 'STEPS', 'SLEEP', 'EXERCISE');

-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('MANUAL', 'HEALTH');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "LeaderboardVisibility" AS ENUM ('SHOW', 'ANONYMOUS', 'HIDDEN');

-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('PROGRESS', 'MILESTONE', 'BADGE', 'REFLECTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('CLAP', 'FIRE', 'STRONG');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'REACTION', 'BADGE', 'STREAK');

-- CreateEnum
CREATE TYPE "HealthProviderKind" AS ENUM ('GOOGLE_HEALTH', 'HEALTH_CONNECT');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "leaderboardVisibility" "LeaderboardVisibility" NOT NULL DEFAULT 'SHOW',
ADD COLUMN     "profileVisibility" "Visibility" NOT NULL DEFAULT 'FRIENDS',
ADD COLUMN     "showArcDay" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showBadges" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showStreak" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showXp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "statsArcDay" INTEGER,
ADD COLUMN     "statsArcLength" INTEGER,
ADD COLUMN     "statsAvgCompletion" DOUBLE PRECISION,
ADD COLUMN     "statsStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "statsStreakThrough" DATE,
ADD COLUMN     "statsTimezone" TEXT,
ADD COLUMN     "statsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "totalXp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "integrationTarget" INTEGER,
ADD COLUMN     "integrationType" "HabitIntegration" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "HabitLog" ADD COLUMN     "source" "LogSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "DailyRecord" ADD COLUMN     "sleepSource" "LogSource",
ADD COLUMN     "stepsSource" "LogSource",
ADD COLUMN     "weightSource" "LogSource";

-- CreateTable
CREATE TABLE "XPEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arcId" TEXT,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XPEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "arcId" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("userId","friendId")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'FRIENDS',
    "arcId" TEXT,
    "milestoneType" TEXT,
    "badgeKey" TEXT,
    "dayNumber" INTEGER,
    "arcLength" INTEGER,
    "streak" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "NotificationType" NOT NULL,
    "referenceId" TEXT,
    "dedupeKey" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "HealthProviderKind" NOT NULL,
    "providerUserId" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT NOT NULL DEFAULT '',
    "dataTypes" TEXT NOT NULL DEFAULT '',
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthDailyMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER,
    "sleepMinutes" INTEGER,
    "sleepStart" TIMESTAMP(3),
    "sleepEnd" TIMESTAMP(3),
    "exerciseMinutes" INTEGER,
    "exerciseSessions" INTEGER,
    "weight" DOUBLE PRECISION,
    "source" "HealthProviderKind" NOT NULL,
    "sourceRecordHash" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthDeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthDeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedInConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedInConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "userId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("userId","bucket","windowStart")
);

-- CreateIndex
CREATE INDEX "XPEvent_createdAt_idx" ON "XPEvent"("createdAt");

-- CreateIndex
CREATE INDEX "XPEvent_userId_createdAt_idx" ON "XPEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XPEvent_arcId_idx" ON "XPEvent"("arcId");

-- CreateIndex
CREATE UNIQUE INDEX "XPEvent_userId_key_key" ON "XPEvent"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");

-- CreateIndex
CREATE INDEX "UserBadge_earnedAt_idx" ON "UserBadge"("earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_pairKey_key" ON "FriendRequest"("pairKey");

-- CreateIndex
CREATE INDEX "FriendRequest_receiverId_status_idx" ON "FriendRequest"("receiverId", "status");

-- CreateIndex
CREATE INDEX "FriendRequest_senderId_status_idx" ON "FriendRequest"("senderId", "status");

-- CreateIndex
CREATE INDEX "Friendship_friendId_idx" ON "Friendship"("friendId");

-- CreateIndex
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_visibility_createdAt_idx" ON "Post"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "PostReaction_postId_idx" ON "PostReaction"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostReaction_postId_userId_type_key" ON "PostReaction"("postId", "userId", "type");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "HealthConnection_lastSyncedAt_idx" ON "HealthConnection"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthConnection_userId_provider_key" ON "HealthConnection"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "HealthDailyMetric_userId_date_key" ON "HealthDailyMetric"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HealthDeviceToken_tokenHash_key" ON "HealthDeviceToken"("tokenHash");

-- CreateIndex
CREATE INDEX "HealthDeviceToken_userId_idx" ON "HealthDeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInConnection_userId_key" ON "LinkedInConnection"("userId");

-- CreateIndex
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "XPEvent" ADD CONSTRAINT "XPEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPEvent" ADD CONSTRAINT "XPEvent_arcId_fkey" FOREIGN KEY ("arcId") REFERENCES "Arc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_arcId_fkey" FOREIGN KEY ("arcId") REFERENCES "Arc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthConnection" ADD CONSTRAINT "HealthConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthDailyMetric" ADD CONSTRAINT "HealthDailyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthDeviceToken" ADD CONSTRAINT "HealthDeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedInConnection" ADD CONSTRAINT "LinkedInConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

