#!/usr/bin/env node
/*
 * Smoke-test the exercise search route against a running local/dev server.
 * Usage: node scripts/test-exercise-search.js [baseUrl]
 */

const baseUrl = process.argv[2] || process.env.EXERCISE_API_BASE_URL || 'http://localhost:3000';
const url = new URL('/api/exercises/search', baseUrl);
url.searchParams.set('q', 'bench');
url.searchParams.set('equipment', 'barbell');
url.searchParams.set('muscle', 'chest');
url.searchParams.set('level', 'beginner');
url.searchParams.set('limit', '3');

async function main() {
  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok) {
    console.error(`Exercise search failed with HTTP ${response.status}`);
    console.error(body);
    process.exit(1);
  }

  if (!Array.isArray(body.data)) {
    console.error('Exercise search response did not include a data array.');
    process.exit(1);
  }

  console.log(`OK: ${body.data.length} exercise(s) returned from ${url.origin}`);
  for (const exercise of body.data) {
    console.log(`- ${exercise.title} (${exercise.slug})`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
