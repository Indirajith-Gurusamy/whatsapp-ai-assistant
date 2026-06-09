-- Store sanitized HTML email body for rich display (plain text remains in message)
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "html_body" TEXT;
