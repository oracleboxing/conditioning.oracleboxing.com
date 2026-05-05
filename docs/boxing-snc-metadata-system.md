# Boxing S&C Metadata System

The workout builder should not rely on vague tags like `gas-tank`. It needs structured metadata that answers one question:

> When a boxer asks for a session, where does this exercise actually fit?

## Core principle

Metadata should be permissive for retrieval and strict for final selection.

- Retrieval: always find candidates, even if metadata is imperfect.
- Ranking: prefer exercises that match target, equipment, role, adaptation, and constraints.
- Validation: never output unavailable equipment or duplicate the same exercise repeatedly.

## Columns

### `boxing_snc_roles text[]`
Where this exercise belongs inside a workout.

Allowed values:
- `warmup_prep`
- `activation`
- `primary_strength`
- `power`
- `accessory_strength`
- `conditioning`
- `core`
- `mobility`
- `rehab_prehab`
- `finisher`

### `boxing_snc_adaptations text[]`
The boxing qualities this exercise genuinely supports. These must be specific, not motivational fluff.

Allowed values:
- `trunk_stiffness`
- `rotational_power`
- `anti_rotation`
- `anti_extension`
- `shoulder_durability`
- `scapular_control`
- `hip_drive`
- `leg_strength`
- `posterior_chain`
- `footwork_elasticity`
- `ankle_stiffness`
- `repeat_power`
- `aerobic_support`
- `anaerobic_tolerance`
- `postural_strength`
- `mobility_restore`
- `neck_durability`
- `general_strength`

### `boxing_snc_movement_families text[]`
Cleaner movement taxonomy for matching.

Allowed values:
- `squat`
- `hinge`
- `lunge`
- `single_leg`
- `push`
- `pull`
- `carry`
- `rotation`
- `anti_rotation`
- `anti_extension`
- `trunk_flexion`
- `lateral_flexion`
- `gait`
- `jump`
- `calf_ankle`
- `shoulder_prehab`
- `mobility`
- `isometric`

### `boxing_snc_body_regions text[]`
Target areas for user intent.

Allowed values:
- `trunk`
- `abs`
- `obliques`
- `shoulders`
- `scapula`
- `chest`
- `upper_back`
- `lats`
- `arms`
- `biceps`
- `triceps`
- `hips`
- `glutes`
- `quads`
- `hamstrings`
- `calves`
- `ankles`
- `neck`
- `full_body`

### `boxing_snc_scores jsonb`
All scores are 0-100.

Required keys:
- `boxing_transfer`: overall transfer to boxing S&C
- `target_fit`: how directly the exercise trains its labelled target
- `strength`: strength usefulness
- `power`: power / rate-of-force usefulness
- `conditioning`: conditioning usefulness
- `trunk`: trunk/core usefulness
- `shoulder_health`: shoulder durability/scap control usefulness
- `footwork`: foot/ankle/leg elasticity or boxing movement base
- `mobility`: mobility/recovery usefulness
- `fatigue_cost`: systemic fatigue cost, high means expensive
- `injury_risk`: risk/complexity cost, high means needs caution
- `setup_cost`: setup friction, high means annoying to program
- `technical_complexity`: coaching complexity
- `beginner_fit`: suitability for beginners

### `boxing_snc_equipment_fit jsonb`
Useful because equipment tags are messy.

Shape:
```json
{
  "required": ["dumbbell"],
  "optional": ["bench"],
  "substitutable_with": ["bands", "cable"],
  "home_friendly": true,
  "gym_friendly": true
}
```

### `boxing_snc_prescription jsonb`
Suggested programming defaults.

Shape:
```json
{
  "best_block_types": ["primary_strength", "accessory_strength"],
  "default_sets": "3-4",
  "default_reps": "6-10",
  "default_duration_seconds": null,
  "default_rest_seconds": 60,
  "tempo": "controlled",
  "coaching_cue": "Brace first, move with control."
}
```

## Retrieval behaviour

1. Parse user intent into:
   - target body regions
   - desired adaptation
   - equipment constraints
   - time/intensity
   - injury/avoidance constraints
2. Pull candidates by equipment first when equipment is specific.
3. Rank by:
   - equipment exactness
   - body-region match
   - adaptation match
   - role fit for current workout block
   - scores
   - fatigue cost vs requested intensity
   - setup cost vs session length
4. If no perfect match exists, relax adaptation/body-region first.
5. Never relax equipment when user says only/just/with specific kit unless no result is possible, then ask a clarification rather than silently switching equipment.

## What not to do

- Do not use vague labels like `gas-tank` as a hard filter.
- Do not tag every calf raise as conditioning.
- Do not let a single tag decide the workout.
- Do not force boxing transfer where there is none. Some exercises are just general accessories, and that is fine.
