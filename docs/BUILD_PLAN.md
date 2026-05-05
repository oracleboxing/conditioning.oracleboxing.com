# Oracle Conditioning - Build Plan

## Product

A premium-only AI S&C workout builder for Oracle Boxing members.

Users chat with an AI coach to create one individual workout at a time. The AI understands their goal, time, equipment, training context, injuries, boxing relevance, and preferences, then builds a clean saved workout using a curated exercise database.

## USP

The USP is not "AI makes a workout". Everyone can do that badly.

The USP is:
- a tight chat intake that actually understands what the member is trying to achieve
- efficient search over a real exercise library
- boxing-aware constraints and coaching logic
- clean generated workout pages members can actually follow
- a community gallery of useful workouts made by other members
- saved workouts tied to member profiles

## MVP Today

1. Auth
   - Supabase email magic link or password auth
   - Premium allowlist by email for first test
   - Later: Skool/Stripe premium sync

2. Exercise library
   - Use `yuhonas/free-exercise-db`
   - Import JSON metadata and image paths into Supabase
   - Store images either:
     - hotlink GitHub raw for internal prototype, fastest
     - or copy to Supabase Storage if we want reliability/control

3. AI workout chat
   - Chat interface, not a boring form
   - AI asks only the missing questions
   - AI produces structured workout JSON
   - Server validates that every exercise exists in Supabase
   - Save workout + items to Supabase

4. Workout page
   - Title, goal, duration, equipment
   - Warm-up / main / finisher / mobility blocks
   - Exercise cards with image, sets, reps/time, rest, coaching notes
   - Copy/share link

5. Community gallery
   - Public-to-members feed of generated workouts
   - Filter by equipment, goal, duration, difficulty
   - Save/remix later

6. Profile
   - My workouts
   - Saved workouts later

## Build Phases

### Phase 0 - Project setup
- Next.js app scaffolded
- Env placeholders added
- Supabase schema drafted
- Exercise import script drafted

### Phase 1 - Database + import
- Create tables
- Import free-exercise-db into `exercises`
- Preserve raw payload in `source_payload`
- Add indexes for equipment, category, muscles, search

### Phase 2 - Auth + premium gate
- Supabase auth pages
- Middleware/session check
- Allowlist premium gate

### Phase 3 - AI chat generator
- Chat UI
- Server route `/api/chat/workout`
- Tool-like internal search over Supabase exercises
- Structured JSON output
- Validation + save

### Phase 4 - Workout render
- Workout detail page
- Exercise cards
- Mobile-first design

### Phase 5 - Community
- Gallery page
- Visibility toggle: private/community
- Filters

### Phase 6 - Deploy
- Vercel project
- Supabase env vars
- Domain: conditioning.oracleboxing.com
- Smoke test with 3-5 members

## AI Chat Flow

The assistant should behave like a smart S&C coach, not ChatGPT with a gym bro costume.

Conversation goals:
1. Identify workout purpose
2. Identify available equipment
3. Identify duration
4. Identify current level
5. Identify limitations/injuries
6. Identify preferred style, circuit, strength sets, conditioning, mobility, boxing-specific
7. Generate workout only once enough information is known

It should ask 1-2 questions at a time, not a massive survey.

Example first message:
"What are we building today, conditioning, strength, mobility, explosive power, or a mix? Also, what equipment do you actually have access to?"

Structured output shape:
```json
{
  "title": "30-Minute Boxing Conditioning Circuit",
  "goal": "conditioning",
  "durationMinutes": 30,
  "difficulty": "beginner",
  "equipment": ["body only", "dumbbell"],
  "blocks": [
    {
      "type": "warmup",
      "title": "Raise temperature",
      "items": [
        {
          "exerciseId": "Air_Bike",
          "sets": 1,
          "durationSeconds": 60,
          "restSeconds": 15,
          "coachingNote": "Keep it smooth, do not sprint the warm-up."
        }
      ]
    }
  ]
}
```

## Model Choice

Start custom, not Vercel AI Gateway.

Reason:
- faster to reason about
- less moving parts today
- direct OpenAI structured output is enough
- can switch to Vercel AI SDK later for streaming polish

Use a normal server route first:
- `/api/chat/workout` for chat turns
- `/api/workouts` for save/list

Later upgrade:
- Vercel AI SDK `useChat`
- tool calls for exercise search
- streaming UI

## Storage Decision

For today:
- Do not use R2
- Do not use Supabase Storage unless hotlinking is flaky
- Store exercise image paths from free-exercise-db
- Render images from GitHub raw URL for prototype

For real paid feature:
- Best move is Supabase Storage if the dataset license allows copying images
- Supabase Pro includes 100GB storage and 250GB egress
- That is plenty for this library unless usage explodes

## Safety / Legal

- Confirm free-exercise-db license before commercial launch
- Keep attribution if required by source
- Do not wipe any existing Supabase project until Jordan explicitly confirms

## Vercel Setup - 2026-05-05

Project created:
- Vercel team: Oracle Boxing (`jts-projects-1f07b08d`)
- Vercel project: `conditioning-oracleboxing`
- Local project linked via `.vercel/project.json`
- Domain added to Vercel: `conditioning.oracleboxing.com`

DNS record needed in Cloudflare:
- Type: CNAME
- Name: conditioning
- Target: cname.vercel-dns.com
- Proxy: DNS only for first verification

Environment variables:
- Supabase target project loaded locally and into Vercel envs
- OpenAI key loaded locally and into Vercel envs
- Free exercise DB source env loaded

Note: no production deployment has been triggered yet.

## Progress Update - 2026-05-05

### Completed
- Fresh Next.js project scaffolded at `/home/jordan/conditioning.oracleboxing.com`
- GitHub repo initialised and pushed: `git@github.com:oracleboxing/conditioning.oracleboxing.com.git`
- Vercel project created and linked: `conditioning-oracleboxing`
- Domain added in Vercel: `conditioning.oracleboxing.com`
- DNS record required in Cloudflare:
  - CNAME `conditioning` -> `cname.vercel-dns.com`
  - DNS-only for first verification
- Environment variables loaded locally in `.env.local`
- Environment variables loaded into Vercel for production, preview and development
- `.env` / `.env.example` kept placeholder-safe, real secrets only in `.env.local` and Vercel
- Initial build verified with `npm run build`
- Supabase target selected: `https://rabudzkpputmollmpodd.supabase.co`
- Exercise import sub-agent started
- Import script created: `scripts/import-free-exercise-db.js`
- Import is running safely with no deletes/wipes/truncates
- Latest observed import progress: 750 / 873 exercises imported, 1,500 images uploaded, 0 failures

### Important Notes
- We are using `yuhonas/free-exercise-db` for the MVP exercise library.
- The importer detected the existing Oracle app exercise schema and adapted records into it instead of forcing the new draft schema.
- Images are being uploaded to Supabase Storage bucket `exercise-images`.
- Metadata preserves the original source payload inside `structure_json.source_payload`.

## Recommended Next Steps

### 1. Let the import finish and verify counts
Wait for the importer to complete, then confirm:
- exercise count imported
- image count uploaded
- sample public image URL loads
- search/query shape is usable for the app

### 2. Build exercise search API
Create server-side exercise search over Supabase:
- filter by equipment
- filter by category
- filter by primary/secondary muscles
- fuzzy search by title/slug
- return compact records for AI use

This is the core engine. If search is bad, the AI workout builder becomes generic mush.

### 3. Build auth + premium gate
Fast MVP:
- Supabase auth
- allowlist premium emails via env or `member_access`
- all app pages behind login except landing page

Later:
- sync paid Skool/Stripe members automatically

### 4. Build AI chat workout creator
Use custom API route first, not Vercel AI SDK complexity yet.

Route:
- `POST /api/workout-chat`

Flow:
- chat asks concise questions
- gathers goal, equipment, time, level, injuries, focus
- calls internal exercise search
- returns validated structured workout JSON
- saves workout + workout items

Model:
- start with OpenAI directly
- keep AI Gateway key ready for later routing if useful

### 5. Build clean workout page
This is the thing members actually use.

Needs:
- mobile-first page
- workout overview
- warm-up/main/finisher blocks
- exercise cards with image, sets/reps/time/rest
- coaching note per exercise
- visibility toggle: private/community

### 6. Build community gallery
Simple but valuable:
- feed of community workouts
- filters for duration, equipment, goal, difficulty
- click into workout
- later: save/remix/like

### 7. Deploy first test build
Once auth + one generated workout path works:
- deploy to Vercel
- verify envs
- verify domain
- send to 3-5 trusted members

## Strong Product Opinion

The first release should be narrow and excellent:

"Tell the AI what you want to train today, what equipment you have, and what your body can handle. It builds one clean boxing-relevant S&C workout you can save and follow."

Do not build full programmes yet. Individual workouts are faster, clearer, and easier to make genuinely useful.
