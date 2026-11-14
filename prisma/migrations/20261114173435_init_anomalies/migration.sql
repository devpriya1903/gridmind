-- CreateTable
CREATE TABLE "Anomaly" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anomaly_readingId_idx" ON "Anomaly"("readingId");

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;
