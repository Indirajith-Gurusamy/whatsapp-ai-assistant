-- AlterTable
ALTER TABLE "auth_users" ADD COLUMN     "reset_token" VARCHAR(255),
ADD COLUMN     "reset_token_exp" TIMESTAMPTZ,
ADD COLUMN     "verification_token" VARCHAR(255),
ADD COLUMN     "verification_token_exp" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "auth_users_verification_token_idx" ON "auth_users"("verification_token");

-- CreateIndex
CREATE INDEX "auth_users_reset_token_idx" ON "auth_users"("reset_token");
