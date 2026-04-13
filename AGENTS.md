# AGENTS.md - WhatsApp AI Assistant

## Commands
- **Backend**: `python apps/backend/run.py` (runs on port 8000)
- **Frontend**: `cd apps/frontend && npm run dev` (runs on port 3000)
- **Lint frontend**: `cd apps/frontend && npm run lint`
- **Build frontend**: `cd apps/frontend && npm run build`
- **Database**: `prisma generate && prisma db push`

## Architecture
- **Backend**: FastAPI (Python) in `apps/backend/app/` - modules: core/, db/, modules/
- **Frontend**: Next.js 15 + TypeScript + Tailwind + shadcn/ui in `apps/frontend/src/`
- **Database**: PostgreSQL via Prisma ORM (`prisma/schema.prisma`), async Python client
- **External APIs**: Twilio (WhatsApp), Groq LLM (Llama 3.3 70B)
- **Env files**: `apps/env/backend.env`, `apps/env/frontend.env`

## Code Style
- **Python**: FastAPI + Pydantic models, async/await, snake_case
- **TypeScript**: Strict typing, React 19, SWR for data fetching
- **Frontend components**: Use shadcn/ui (Radix primitives), Tailwind CSS
- **Database**: Prisma snake_case mapping (`@map`), use indexes for query fields
- **Imports**: Group stdlib, third-party, local; use absolute imports in frontend
