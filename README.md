# Global Payout Orchestrator

A global payout orchestration platform that routes payments across bank and stablecoin rails using a rules-based engine and executes settlements via Mural Pay sandbox, with full ledger tracking and a production-grade dashboard deployed on Vercel.

## Features

- Rules-based rail selection (`bank` vs `stablecoin`)
- Payout execution layer through Mural sandbox API
- Ledger persistence with PostgreSQL (Supabase/Neon compatible)
- Routing logs for explainable decisions
- Dashboard views:
  - `/` overview metrics + recent payouts
  - `/payouts` searchable/filterable ledger
  - `/new` create payout form
  - `/payout/[id]` full payout detail
- Optional AI-style suggestion endpoint: `POST /api/ai-suggest`

## API Endpoints

- `POST /api/payouts` create payout (route -> execute -> store)
- `GET /api/payouts` list payouts with optional filters (`country`, `rail`, `status`)
- `GET /api/payouts/:id` get payout + routing detail
- `POST /api/ai-suggest` parse prompt and suggest rail (routing engine remains source of truth)

## Environment Variables

Copy `.env.example` to `.env.local` and set:

```bash
MURAL_API_KEY=
MURAL_BASE_URL=https://api-staging.muralpay.com
MURAL_SOURCE_ACCOUNT_ID=
MURAL_ORG_ID=
MURAL_TRANSFER_API_KEY=
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
```

If `MURAL_API_KEY` is empty, payout execution runs in simulated mode for demo purposes.
If `MURAL_API_KEY` is set, also set `MURAL_SOURCE_ACCOUNT_ID` and `MURAL_ORG_ID` to valid UUIDs from your Mural sandbox account.
For request execution, provide `MURAL_TRANSFER_API_KEY` when your sandbox org requires it.

## Local Development

```bash
npm install
npm run dev
```

## Database

Tables are auto-created at runtime on first request, or you can apply `db/schema.sql` manually.

## Deploy on Vercel

1. Push repo to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.example`
4. Deploy
