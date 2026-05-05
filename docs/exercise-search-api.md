# Exercise Search API

Endpoint:

```bash
GET /api/exercises/search
```

Supported query params:

- `q` - text search against title, slug, summary, and description
- `equipment` - comma-separated equipment tags, for example `barbell,dumbbell`
- `category` - comma-separated categories, for example `strength,stretching`
- `muscle` - comma-separated primary or secondary muscles, for example `chest,triceps`
- `level` or `difficulty` - comma-separated difficulty values, for example `beginner,intermediate`
- `limit` - defaults to `24`, capped at `100`

Example curl while the dev server is running:

```bash
curl "http://localhost:3000/api/exercises/search?q=bench&equipment=barbell&muscle=chest&level=beginner&limit=5"
```

Example response shape:

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "barbell-bench-press-medium-grip",
      "title": "Barbell Bench Press - Medium Grip",
      "equipment": ["barbell"],
      "category": "strength",
      "muscles": {
        "primary": ["chest"],
        "secondary": ["shoulders", "triceps"]
      },
      "difficulty": "beginner",
      "instructionsSummary": "Lie back on a flat bench...",
      "imageUrl": "https://..."
    }
  ],
  "meta": {
    "limit": 5,
    "returned": 1,
    "filters": {
      "q": "bench",
      "equipment": ["barbell"],
      "category": [],
      "muscle": ["chest"],
      "difficulty": ["beginner"]
    }
  }
}
```
