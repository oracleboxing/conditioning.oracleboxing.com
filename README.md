# Oracle Conditioning

Premium AI S&C workout builder for Oracle Boxing members.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Docs

- `docs/BUILD_PLAN.md` - product, phases, AI flow
- `docs/CREDENTIALS.md` - required env vars
- `supabase/schema.sql` - initial database schema
- `docs/community-gallery-sql.md` - community workout visibility and RLS notes

## Current direction

- Next.js app
- Supabase auth + database
- `yuhonas/free-exercise-db` exercise library
- AI chat intake that generates one individual S&C workout
- Saved workout pages + community gallery
