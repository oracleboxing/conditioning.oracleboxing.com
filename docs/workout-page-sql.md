# Saved workout page SQL notes

The `/workouts/[id]` page can render from the current MVP `workouts` and `workout_items` tables.

Current fetch shape:

- `workouts`: `id`, `user_id`, `title`, `goal`, `duration_minutes`, `difficulty`, `equipment`, `visibility`, `intake_summary`, `created_at`
- `workout_items`: `id`, `workout_id`, `exercise_id`, `order_index`, `block_type`, `block_title`, `sets`, `reps`, `duration_seconds`, `rest_seconds`, `tempo`, `coaching_note`
- `exercises`: `id`, `title`, `category`, `equipment_tags`, `instructions_json`, `structure_json`

Recommended additions before the AI workout generator starts saving production workouts:

```sql
alter table public.workout_items
  add column if not exists coaching_cues text[] default '{}',
  add column if not exists boxing_relevance text;

create index if not exists workout_items_block_order_idx
  on public.workout_items (workout_id, block_type, order_index);
```

Recommended RLS baseline:

```sql
alter table public.workouts enable row level security;
alter table public.workout_items enable row level security;

create policy "Members can read community workouts"
  on public.workouts for select
  using (visibility = 'community');

create policy "Members can read their private workouts"
  on public.workouts for select
  using (auth.uid() = user_id);

create policy "Workout items follow workout visibility"
  on public.workout_items for select
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_items.workout_id
        and (w.visibility = 'community' or w.user_id = auth.uid())
    )
  );
```

Future AI save shape should map cleanly into these columns:

```json
{
  "title": "30-Minute Boxing Conditioning Circuit",
  "goal": "conditioning",
  "durationMinutes": 30,
  "difficulty": "beginner",
  "equipment": ["bodyweight", "dumbbell"],
  "visibility": "private",
  "blocks": [
    {
      "type": "warmup",
      "title": "Raise temperature",
      "items": [
        {
          "exerciseId": "exercise_uuid_or_slug",
          "sets": 1,
          "durationSeconds": 60,
          "restSeconds": 15,
          "tempo": "smooth",
          "coachingNote": "Keep it smooth, do not sprint the warm-up.",
          "coachingCues": ["Light feet", "Relax the shoulders"],
          "boxingRelevance": "Builds rhythm and calf tolerance for footwork rounds."
        }
      ]
    }
  ]
}
```
