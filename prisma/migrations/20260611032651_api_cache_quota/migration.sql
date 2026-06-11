-- CreateTable
CREATE TABLE "ApiCall" (
    "endpoint" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCall_pkey" PRIMARY KEY ("endpoint")
);

-- CreateTable
CREATE TABLE "ApiQuota" (
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiQuota_pkey" PRIMARY KEY ("day")
);
