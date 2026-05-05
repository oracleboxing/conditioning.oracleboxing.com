# Credentials Needed

Create `.env.local` from `.env.example` and fill:

```bash
cp .env.example .env.local
```

Needed now:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_WORKOUT_MODEL` optional, defaults to `gpt-4o-mini`; use a stronger mini workout model such as `gpt-5-mini` only once the account supports it
- `PREMIUM_ALLOWLIST_EMAILS`

Needed for deploy:
- Vercel project linked
- same env vars in Vercel
- Cloudflare CNAME for `conditioning.oracleboxing.com`

Do not commit `.env.local`.

- `OPENAI_WORKOUT_MODEL` optional. Defaults to `gpt-5.4-mini` for workout generation/editing; use `gpt-4o-mini` only if cost needs to be aggressively reduced.
