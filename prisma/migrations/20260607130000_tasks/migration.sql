-- Tasks table for CRM task management

CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'review', 'completed', 'cancelled');
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS "tasks" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "due_date" TIMESTAMPTZ,
    "assigned_to" VARCHAR(255),
    "created_by_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tasks_uuid_key" ON "tasks"("uuid");
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks"("status");
CREATE INDEX IF NOT EXISTS "tasks_priority_idx" ON "tasks"("priority");
