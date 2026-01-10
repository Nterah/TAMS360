# Vercel Environment Variables - EXACT VALUES

## ⚠️ CRITICAL: Update These in Vercel Dashboard

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Delete any existing variables and add these EXACT values:

---

### Variable 1: VITE_SUPABASE_URL

**Name:**
```
VITE_SUPABASE_URL
```

**Value:**
```
https://fuvzhbuvwpnysluojqni.supabase.co
```

**Environment:** ✓ Production ✓ Preview ✓ Development

---

### Variable 2: VITE_SUPABASE_ANON_KEY

**Name:**
```
VITE_SUPABASE_ANON_KEY
```

**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dnpoYnV2d3BueXNsdW9qcW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjYxMzAsImV4cCI6MjA2OTk0MjEzMH0.HIDTkfm_glqEQG3JFXqmw6QHRJ6W57hA10TseweH5PA
```

**Environment:** ✓ Production ✓ Preview ✓ Development

---

### Variable 3: VITE_SUPABASE_SERVICE_ROLE_KEY

**Name:**
```
VITE_SUPABASE_SERVICE_ROLE_KEY
```

**Value:**
```
[Get from Supabase Dashboard → Settings → API → Service Role Key (secret)]
```

**Environment:** ✓ Production ✓ Preview ✓ Development

---

## How to Get Service Role Key

1. Go to https://supabase.com/dashboard
2. Select your project: `fuvzhbuvwpnysluojqni`
3. Click **Settings** (gear icon) → **API**
4. Scroll to **Project API keys**
5. Copy the **`service_role`** key (starts with `eyJ...`)
6. Paste it as the value for VITE_SUPABASE_SERVICE_ROLE_KEY

---

## After Adding Variables

1. **Save** all three variables
2. Go to **Deployments** tab
3. Click **"..."** on latest deployment
4. Click **"Redeploy"**
5. Wait for deployment to complete
6. Test: https://app.tams360.co.za

---

**Date:** January 10, 2026  
**Project:** TAMS360 Road Asset Management
