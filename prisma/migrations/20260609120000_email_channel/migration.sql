-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WHATSAPP', 'EMAIL');

-- AlterEnum
ALTER TYPE "SettingCategory" ADD VALUE 'EMAIL';

-- AlterTable customers
ALTER TABLE "customers" ADD COLUMN "channel" "Channel" NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "customers" ADD COLUMN "email" VARCHAR(255);
ALTER TABLE "customers" ALTER COLUMN "wa_id" DROP NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "customers_channel_idx" ON "customers"("channel");
CREATE INDEX "customers_email_idx" ON "customers"("email");
CREATE UNIQUE INDEX "customers_channel_email_key" ON "customers"("channel", "email");

-- AlterTable conversations
ALTER TABLE "conversations" ADD COLUMN "channel" "Channel" NOT NULL DEFAULT 'WHATSAPP';
CREATE INDEX "conversations_channel_idx" ON "conversations"("channel");

-- AlterTable messages
ALTER TABLE "messages" ADD COLUMN "channel" "Channel" NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "messages" ADD COLUMN "external_id" VARCHAR(512);
CREATE INDEX "messages_channel_idx" ON "messages"("channel");
CREATE UNIQUE INDEX "messages_external_id_key" ON "messages"("external_id");
