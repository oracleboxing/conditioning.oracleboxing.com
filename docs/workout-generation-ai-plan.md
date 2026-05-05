# Workout Generation AI Plan

## Goal
Build the workout creator into a proper conversational S&C coach for boxing, not a form with AI bolted on.

The AI should:
- Understand what the user is trying to achieve.
- Ask only genuinely useful missing questions.
- Query the uploaded Supabase `free-exercise-db` exercise library.
- Recommend exercises with enough variety that it does not spit out the same session every time.
- Let the user reject/swap exercises before saving.
- Keep all displayed exercise names tied to database titles, never invented names.

## Current state
- `/app/create` is now a ChatGPT-style streaming chat surface.
- API route: `src/app/api/chat/workout/route.ts`.
- Main orchestration: `src/lib/ai/workout-creator.ts`.
- Prompt definitions: `src/lib/ai/workout-prompts.ts`.
- Exercise retrieval: `src/lib/exercises/search.ts`.
- Saved output tables: `workouts`, `workout_items`.
- Chat history tables: `workout_chat_sessions`, `workout_chat_messages`.

## Problems to fix next
1. **The AI still behaves too rigidly**
   - It extracts a small intake object, then jumps to generation.
   - It should reason more like: “What adaptation are we chasing, what constraints matter, what session shape fits?”

2. **Exercise search is too generic**
   - Current search terms are broad: squat, lunge, push, row, plank, etc.
   - Need richer mapping from boxing goal to movement qualities:
     - gas tank → intervals, cyclical conditioning, trunk endurance
     - punching power → hips, rotation, anti-rotation, legs, med ball if available
     - footwork → calves, lateral movement, single-leg strength, reactive conditioning
     - shoulder durability → scapular control, external rotation, upper-back work
     - core → anti-extension, anti-rotation, rotation, bracing under fatigue

3. **No transparent exercise choice loop yet**
   - User can reject exercises after draft.
   - Better flow: AI can propose a shortlist and ask: “Any of these you hate or can’t do?” before final structure.

4. **Validation is not strict enough philosophically**
   - Code validates against Supabase rows, good.
   - But prompt and generation should prefer UUIDs only and never rely on title fallback long-term.

5. **Session quality model is weak**
   - Need a deterministic session skeleton before exercise selection:
     - warm-up
     - strength/power block
     - conditioning block
     - core/mobility/cooldown
   - Then AI fills exercise slots from candidate pools.

## Proposed architecture

### Phase 1: Better intake reasoning
Replace basic missing questions with a “session intent” object:

```ts
type SessionIntent = {
  primaryGoal: string | null;
  boxingTransfer: "gas_tank" | "punching_power" | "footwork" | "shoulder_durability" | "core" | "mobility" | "general";
  sessionType: "strength" | "conditioning" | "hybrid" | "recovery" | "mobility";
  timeMinutes: number | null;
  equipment: string[];
  level: "beginner" | "intermediate" | "advanced" | "unknown";
  constraints: string | null;
  preferences: string[];
  dislikedExerciseIds: string[];
}
```

Rules:
- Ask max one question when goal/equipment/time is impossible to infer.
- Otherwise assume and explain assumptions briefly.
- Keep user moving forward.

### Phase 2: Exercise pool builder
Create `src/lib/ai/exercise-pools.ts`.

It should build named pools instead of one candidate blob:

```ts
type ExercisePools = {
  warmup: CompactExercise[];
  strength: CompactExercise[];
  power: CompactExercise[];
  conditioning: CompactExercise[];
  core: CompactExercise[];
  mobility: CompactExercise[];
  cooldown: CompactExercise[];
}
```

Each pool should be based on:
- user equipment
- goal/boxing transfer
- difficulty
- muscles/categories
- rejected exercises
- recent user history if available

### Phase 3: Deterministic skeleton, AI fill
Create a skeleton first, then ask AI to fill it:

Example hybrid 35 min:
- Warm-up: 5 min, 3 exercises
- Strength: 12 min, 3 exercises
- Conditioning: 12 min, 3 exercises
- Core/cooldown: 6 min, 2 exercises

This prevents nonsense session shape.

### Phase 4: More useful chat loop
After user message:
1. Stream short understanding.
2. If critical info missing, ask one question.
3. Otherwise show draft.
4. Let user reject/swap.
5. Optional: “make it harder/easier/shorter/more boxing-specific”.
6. Save only after approval.

### Phase 5: Strict validation
Update `validateWorkoutExercises` so:
- non-UUID exercise IDs are rejected, not title-matched.
- exercise title fallback is removed from validation.
- UI only displays `item.exercise.title` from fetched DB row.

## Jordan-guided decisions needed
- What are the core Oracle S&C session types?
- How should we categorize boxing outcomes? Current proposal:
  - Gas tank
  - Punching power
  - Footwork
  - Shoulder durability
  - Core/trunk
  - Mobility/recovery
  - General athleticism
- Do we want AI to ask users to choose from exercise options before generating, or only after the draft?
- Should every session include warm-up/cooldown, or can quick sessions skip them?

## Immediate next build step
I recommend we start with Phase 1 + Phase 2:
- Introduce `SessionIntent`.
- Replace generic search terms with boxing-transfer exercise pools.
- Keep UI unchanged while we improve the brain.

Then we test prompts live and tune with Jordan’s feedback.
