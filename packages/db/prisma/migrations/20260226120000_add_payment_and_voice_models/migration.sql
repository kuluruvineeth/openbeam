-- CreateEnum
CREATE TYPE "WalletCustodyMode" AS ENUM ('SELF_CUSTODY', 'MANAGED');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PricingTargetType" AS ENUM ('ROUTE', 'TOOL');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('STATIC', 'DYNAMIC');

-- CreateEnum
CREATE TYPE "PaymentVerificationResult" AS ENUM ('VERIFIED', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "PaymentSettlementResult" AS ENUM ('SETTLED', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'FEE');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "payment_wallet" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "custodyMode" "WalletCustodyMode" NOT NULL,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_wallet_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "payment_pricing_policy" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "targetType" "PricingTargetType" NOT NULL,
    "targetName" TEXT NOT NULL,
    "pricingMode" "PricingMode" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "network" TEXT NOT NULL DEFAULT 'eip155:84532',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pricing_policy_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "payment_receipt" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "payer" TEXT NOT NULL,
    "payTo" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "verificationResult" "PaymentVerificationResult" NOT NULL DEFAULT 'PENDING',
    "settlementResult" "PaymentSettlementResult" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "facilitatorResponse" JSONB,
    "correlationId" TEXT,
    "toolName" TEXT,
    "routePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_receipt_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "payment_ledger_entry" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_ledger_entry_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "payment_attempt" (
    "_id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "facilitatorPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempt_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "voice_note" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "audioUrl" TEXT,
    "duration" INTEGER,
    "context" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_note_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "voice_settings" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "engine" TEXT NOT NULL DEFAULT 'cloud',
    "model" TEXT NOT NULL DEFAULT 'base.en',
    "language" TEXT NOT NULL DEFAULT 'en',
    "formatting" BOOLEAN NOT NULL DEFAULT true,
    "formatStyle" TEXT NOT NULL DEFAULT 'context-aware',
    "shortcuts" JSONB NOT NULL DEFAULT '{}',
    "vocabulary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "widgetPosition" TEXT NOT NULL DEFAULT 'bottom-center',
    "widgetOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "autoHide" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_settings_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "voice_session" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "roomName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "wordsSpoken" INTEGER NOT NULL DEFAULT 0,
    "toolCalls" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "voice_session_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "payment_wallet_teamId_idx" ON "payment_wallet"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_wallet_teamId_chain_address_key" ON "payment_wallet"("teamId", "chain", "address");

-- CreateIndex
CREATE INDEX "payment_pricing_policy_teamId_isActive_idx" ON "payment_pricing_policy"("teamId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payment_pricing_policy_teamId_targetType_targetName_key" ON "payment_pricing_policy"("teamId", "targetType", "targetName");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipt_requestId_key" ON "payment_receipt"("requestId");

-- CreateIndex
CREATE INDEX "payment_receipt_teamId_createdAt_idx" ON "payment_receipt"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_receipt_requestId_idx" ON "payment_receipt"("requestId");

-- CreateIndex
CREATE INDEX "payment_receipt_txHash_idx" ON "payment_receipt"("txHash");

-- CreateIndex
CREATE INDEX "payment_ledger_entry_teamId_createdAt_idx" ON "payment_ledger_entry"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_ledger_entry_receiptId_idx" ON "payment_ledger_entry"("receiptId");

-- CreateIndex
CREATE INDEX "payment_attempt_receiptId_idx" ON "payment_attempt"("receiptId");

-- CreateIndex
CREATE INDEX "voice_note_userId_createdAt_idx" ON "voice_note"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "voice_note_teamId_createdAt_idx" ON "voice_note"("teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "voice_settings_userId_key" ON "voice_settings"("userId");

-- CreateIndex
CREATE INDEX "voice_session_userId_startedAt_idx" ON "voice_session"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "voice_session_teamId_startedAt_idx" ON "voice_session"("teamId", "startedAt");

-- CreateIndex
CREATE INDEX "voice_session_status_idx" ON "voice_session"("status");

-- AddForeignKey
ALTER TABLE "payment_wallet" ADD CONSTRAINT "payment_wallet_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_pricing_policy" ADD CONSTRAINT "payment_pricing_policy_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_ledger_entry" ADD CONSTRAINT "payment_ledger_entry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_ledger_entry" ADD CONSTRAINT "payment_ledger_entry_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "payment_receipt"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempt" ADD CONSTRAINT "payment_attempt_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "payment_receipt"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_note" ADD CONSTRAINT "voice_note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_note" ADD CONSTRAINT "voice_note_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_settings" ADD CONSTRAINT "voice_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_session" ADD CONSTRAINT "voice_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_session" ADD CONSTRAINT "voice_session_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

