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
- `PREMIUM_ALLOWLIST_EMAILS`

Needed for deploy:
- Vercel project linked
- same env vars in Vercel
- Cloudflare CNAME for `conditioning.oracleboxing.com`

Do not commit `.env.local`.
