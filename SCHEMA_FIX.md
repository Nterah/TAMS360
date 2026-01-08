# Schema Fix for PGRST106 Error

## Problem
Supabase PostgREST only exposes the `public` schema by default. All queries using `.schema("tams360")` fail with:
```
"The schema must be one of the following: public, graphql_public"
```

## Solution
Replace all instances of `.schema("tams360")` with `.from("` (removing schema specification since public is default).

OR better: Ensure all tables are created in the `public` schema, not `tams360`.

## Action Required
Update the backend to remove `.schema("tams360")` from all 27 instances in `/supabase/functions/server/index.tsx`.

Replace:
```javascript
.schema("tams360").from("table_name")
```

With:
```javascript
.from("table_name")
```

This assumes tables exist in the public schema.
