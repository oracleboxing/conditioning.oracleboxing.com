-- Exercise relevance columns for Oracle Conditioning AI search.
-- Safe to run more than once. No deletes.

alter table public.exercises
  add column if not exists force text,
  add column if not exists mechanic text,
  add column if not exists source_equipment text,
  add column if not exists primary_muscles text[] not null default '{}',
  add column if not exists secondary_muscles text[] not null default '{}',
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists movement_patterns text[] not null default '{}',
  add column if not exists boxing_qualities text[] not null default '{}';

update public.exercises
set
  force = coalesce(force, structure_json->>'force', structure_json #>> '{source_payload,force}'),
  mechanic = coalesce(mechanic, structure_json->>'mechanic', structure_json #>> '{source_payload,mechanic}'),
  source_equipment = coalesce(source_equipment, structure_json #>> '{source_payload,equipment}', equipment_tags[1]),
  primary_muscles = case
    when primary_muscles <> '{}' then primary_muscles
    else coalesce(
      array(select jsonb_array_elements_text(coalesce(structure_json->'primary_muscles', structure_json #> '{source_payload,primaryMuscles}', '[]'::jsonb))),
      '{}'
    )
  end,
  secondary_muscles = case
    when secondary_muscles <> '{}' then secondary_muscles
    else coalesce(
      array(select jsonb_array_elements_text(coalesce(structure_json->'secondary_muscles', structure_json #> '{source_payload,secondaryMuscles}', '[]'::jsonb))),
      '{}'
    )
  end,
  image_urls = case
    when image_urls <> '{}' then image_urls
    else coalesce(
      array(
        select distinct url
        from jsonb_array_elements_text(
          coalesce(structure_json->'image_paths', '[]'::jsonb) || coalesce(structure_json #> '{source_payload,storage_image_urls}', '[]'::jsonb)
        ) as url
        where url ~* '^https?://'
      ),
      '{}'
    )
  end
where structure_json->>'source' = 'free-exercise-db';

create index if not exists exercises_primary_muscles_gin_idx on public.exercises using gin (primary_muscles);
create index if not exists exercises_secondary_muscles_gin_idx on public.exercises using gin (secondary_muscles);
create index if not exists exercises_image_urls_gin_idx on public.exercises using gin (image_urls);
create index if not exists exercises_movement_patterns_gin_idx on public.exercises using gin (movement_patterns);
create index if not exists exercises_boxing_qualities_gin_idx on public.exercises using gin (boxing_qualities);
create index if not exists exercises_source_equipment_idx on public.exercises (source_equipment);
create index if not exists exercises_force_idx on public.exercises (force);
create index if not exists exercises_mechanic_idx on public.exercises (mechanic);
