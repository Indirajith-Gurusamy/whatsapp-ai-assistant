/*
  Warnings:

  - You are about to drop the column `verification_token` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `verification_token_exp` on the `auth_users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "auth_users_verification_token_idx";

-- AlterTable
ALTER TABLE "auth_users" DROP COLUMN "verification_token",
DROP COLUMN "verification_token_exp",
ADD COLUMN     "verification_otp" VARCHAR(6),
ADD COLUMN     "verification_otp_exp" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "auth_users_verification_otp_idx" ON "auth_users"("verification_otp");
