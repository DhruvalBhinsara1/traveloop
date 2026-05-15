-- Add ledger fields while keeping legacy amount/paidById columns for compatibility.
ALTER TABLE "Trip" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE "BillParticipant" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "BillParticipant" ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "BillExpense" ADD COLUMN "amountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BillExpense" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "BillExpense" ADD COLUMN "splitMode" TEXT NOT NULL DEFAULT 'equal';
ALTER TABLE "BillExpense" ADD COLUMN "category" TEXT;
ALTER TABLE "BillExpense" ADD COLUMN "note" TEXT;
ALTER TABLE "BillExpense" ADD COLUMN "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BillExpense" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BillExpense" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "BillExpense" ADD COLUMN "createdByUserId" INTEGER;
ALTER TABLE "BillExpense" ADD COLUMN "updatedByUserId" INTEGER;
ALTER TABLE "BillExpense" ADD COLUMN "deletedByUserId" INTEGER;

UPDATE "BillExpense"
SET "amountCents" = ROUND("amount" * 100)::INTEGER,
    "paidAt" = "createdAt",
    "updatedAt" = "createdAt";

CREATE TABLE "BillExpensePayment" (
  "id" SERIAL NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expenseId" INTEGER NOT NULL,
  "participantId" INTEGER NOT NULL,
  CONSTRAINT "BillExpensePayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillExpenseShare" (
  "id" SERIAL NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "percentBps" INTEGER,
  "shares" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expenseId" INTEGER NOT NULL,
  "participantId" INTEGER NOT NULL,
  CONSTRAINT "BillExpenseShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillSettlement" (
  "id" SERIAL NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "note" TEXT,
  "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "tripId" INTEGER NOT NULL,
  "fromParticipantId" INTEGER NOT NULL,
  "toParticipantId" INTEGER NOT NULL,
  "recordedByUserId" INTEGER,
  CONSTRAINT "BillSettlement_pkey" PRIMARY KEY ("id")
);

INSERT INTO "BillExpensePayment" ("expenseId", "participantId", "amountCents", "createdAt")
SELECT "id", "paidById", "amountCents", "createdAt"
FROM "BillExpense";

WITH expense_participants AS (
  SELECT
    e."id" AS "expenseId",
    p."id" AS "participantId",
    e."amountCents",
    COUNT(*) OVER (PARTITION BY e."id") AS "participantCount",
    ROW_NUMBER() OVER (PARTITION BY e."id" ORDER BY p."createdAt" ASC, p."id" ASC) AS "participantRank"
  FROM "BillExpense" e
  JOIN "BillParticipant" p ON p."tripId" = e."tripId"
)
INSERT INTO "BillExpenseShare" ("expenseId", "participantId", "amountCents", "createdAt")
SELECT
  "expenseId",
  "participantId",
  FLOOR("amountCents"::numeric / "participantCount")::INTEGER
    + CASE WHEN "participantRank" <= ("amountCents" % "participantCount") THEN 1 ELSE 0 END,
  CURRENT_TIMESTAMP
FROM expense_participants
WHERE "participantCount" > 0;

ALTER TABLE "BillExpense" DROP CONSTRAINT "BillExpense_paidById_fkey";
ALTER TABLE "BillExpense" ADD CONSTRAINT "BillExpense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "BillParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillExpense" ADD CONSTRAINT "BillExpense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillExpense" ADD CONSTRAINT "BillExpense_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillExpense" ADD CONSTRAINT "BillExpense_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillExpensePayment" ADD CONSTRAINT "BillExpensePayment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "BillExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillExpensePayment" ADD CONSTRAINT "BillExpensePayment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "BillParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillExpenseShare" ADD CONSTRAINT "BillExpenseShare_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "BillExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillExpenseShare" ADD CONSTRAINT "BillExpenseShare_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "BillParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillSettlement" ADD CONSTRAINT "BillSettlement_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillSettlement" ADD CONSTRAINT "BillSettlement_fromParticipantId_fkey" FOREIGN KEY ("fromParticipantId") REFERENCES "BillParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillSettlement" ADD CONSTRAINT "BillSettlement_toParticipantId_fkey" FOREIGN KEY ("toParticipantId") REFERENCES "BillParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillSettlement" ADD CONSTRAINT "BillSettlement_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "BillParticipant_tripId_archivedAt_idx" ON "BillParticipant"("tripId", "archivedAt");

CREATE INDEX "BillExpense_tripId_createdAt_idx" ON "BillExpense"("tripId", "createdAt");
CREATE INDEX "BillExpense_tripId_deletedAt_idx" ON "BillExpense"("tripId", "deletedAt");
CREATE INDEX "BillExpense_tripId_currency_idx" ON "BillExpense"("tripId", "currency");
CREATE INDEX "BillExpense_createdByUserId_idx" ON "BillExpense"("createdByUserId");

CREATE UNIQUE INDEX "BillExpensePayment_expenseId_participantId_key" ON "BillExpensePayment"("expenseId", "participantId");
CREATE INDEX "BillExpensePayment_participantId_idx" ON "BillExpensePayment"("participantId");

CREATE UNIQUE INDEX "BillExpenseShare_expenseId_participantId_key" ON "BillExpenseShare"("expenseId", "participantId");
CREATE INDEX "BillExpenseShare_participantId_idx" ON "BillExpenseShare"("participantId");

CREATE INDEX "BillSettlement_tripId_idx" ON "BillSettlement"("tripId");
CREATE INDEX "BillSettlement_tripId_deletedAt_idx" ON "BillSettlement"("tripId", "deletedAt");
CREATE INDEX "BillSettlement_fromParticipantId_idx" ON "BillSettlement"("fromParticipantId");
CREATE INDEX "BillSettlement_toParticipantId_idx" ON "BillSettlement"("toParticipantId");
CREATE INDEX "BillSettlement_recordedByUserId_idx" ON "BillSettlement"("recordedByUserId");
