-- CreateTable
CREATE TABLE "BillParticipant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tripId" INTEGER NOT NULL,

    CONSTRAINT "BillParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillExpense" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tripId" INTEGER NOT NULL,
    "paidById" INTEGER NOT NULL,

    CONSTRAINT "BillExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillParticipant_tripId_idx" ON "BillParticipant"("tripId");

-- CreateIndex
CREATE INDEX "BillExpense_tripId_idx" ON "BillExpense"("tripId");

-- CreateIndex
CREATE INDEX "BillExpense_paidById_idx" ON "BillExpense"("paidById");

-- AddForeignKey
ALTER TABLE "BillParticipant" ADD CONSTRAINT "BillParticipant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillExpense" ADD CONSTRAINT "BillExpense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillExpense" ADD CONSTRAINT "BillExpense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "BillParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
