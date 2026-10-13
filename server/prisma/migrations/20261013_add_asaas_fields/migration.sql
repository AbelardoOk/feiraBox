-- Add ASAAS fields + WebhookEvent (RF04/RF07)
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "WebhookEvent_processed_idx" ON "WebhookEvent"("processed");
CREATE INDEX IF NOT EXISTS "WebhookEvent_event_idx" ON "WebhookEvent"("event");

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "asaasSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "asaasCustomerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_asaasSubscriptionId_key" ON "Subscription"("asaasSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_asaasSubscriptionId_idx" ON "Subscription"("asaasSubscriptionId");

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "asaasPaymentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "asaasCustomerId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "asaasSubscriptionId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "asaasInvoiceUrl" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "pixQrCode" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "pixCopyPaste" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "gateway" TEXT DEFAULT 'asaas';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "netValue" DECIMAL(10,2);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cardLast4" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cardBrand" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_asaasPaymentId_key" ON "Payment"("asaasPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_asaasPaymentId_idx" ON "Payment"("asaasPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_asaasSubscriptionId_idx" ON "Payment"("asaasSubscriptionId");
