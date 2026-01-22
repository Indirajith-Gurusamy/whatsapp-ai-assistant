-- AlterTable
ALTER TABLE "user_profiles" 
ADD COLUMN "location" JSONB,
ADD COLUMN "date_of_birth" DATE,
ADD COLUMN "social_links" JSONB;
