# DramLog

Whisky check-in app — think Untappd for Scotch. Built with Expo (React Native + TypeScript) and Supabase.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Expo 52 / React Native 0.76 / TypeScript |
| Auth | Supabase Auth (email/password) |
| Database | Supabase Postgres |
| API | Supabase client SDK + Edge Functions (Deno) |
| Barcode scan | expo-camera v16 (on-device, no server) |
| Token storage | expo-secure-store |

## Project structure

```
DramLog/
├── App.tsx                    # Root — AuthProvider + NavigationContainer
├── app.json                   # Expo config (permissions, plugins)
├── src/
│   ├── api/                   # Supabase queries (no business logic)
│   │   ├── barcodes.ts        # lookupBarcode → edge function
│   │   ├── whiskies.ts        # CRUD + FTS search
│   │   └── checkins.ts        # CRUD + feed + stats
│   ├── context/
│   │   └── AuthContext.tsx    # Session state + signIn/signUp/signOut
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client (SecureStore adapter)
│   │   └── slug.ts            # Whisky dedup slug (synced with edge fn)
│   ├── navigation/
│   │   ├── types.ts           # ParamList types for all stacks
│   │   ├── AppNavigator.tsx   # Bottom tabs + stack navigators
│   │   └── AuthNavigator.tsx  # Login / SignUp stack
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── SignUpScreen.tsx
│   │   ├── FeedScreen.tsx          # Infinite-scroll check-in feed
│   │   ├── ScannerScreen.tsx       # Barcode scanner with viewfinder UI
│   │   ├── WhiskyDetailScreen.tsx  # Stats + check-in list + CTA
│   │   ├── CheckInScreen.tsx       # Rating slider + notes + serving style
│   │   ├── ManualEntryScreen.tsx   # Create whisky manually
│   │   ├── SearchScreen.tsx        # Debounced FTS search
│   │   └── ProfileScreen.tsx       # User stats + sign out
│   ├── components/
│   │   └── RatingSlider.tsx        # Tap-based 0–10 rating in 0.5 steps
│   └── types/
│       └── database.ts        # TypeScript types (run supabase gen types to refresh)
├── supabase/
│   ├── config.toml            # Local dev (supabase start)
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # Tables, indexes, triggers, RPC
│   │   └── 002_rls_policies.sql     # Row-level security
│   └── functions/
│       └── barcode-lookup/
│           └── index.ts       # Open Food Facts → UPC ItemDB → manual fallback
└── .env.example
```

## Setup

### 1. Supabase project

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Local dev
supabase start
supabase db push   # applies migrations in order

# Or push to hosted project
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 2. Environment variables

```bash
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
# from your Supabase project Settings → API
```

### 3. Deploy edge function

```bash
supabase functions deploy barcode-lookup

# Optional: set UPC ItemDB API key for higher rate limits
supabase secrets set UPCITEMDB_KEY=your-key-here
```

### 4. Run the app

```bash
npm start        # Expo Go (QR code)
npm run ios      # iOS simulator
npm run android  # Android emulator
```

## Key decisions

**Barcode lookup chain**
`barcode-lookup` edge function checks the DB cache first, then fans out to Open Food Facts and UPC ItemDB. Results are written back to `barcodes` with a `lookup_exhausted` flag so failed lookups aren't retried on every scan.

**Deduplication**
Whiskies are keyed on a `slug` = `{normalized_distillery}__{normalized_name}__{age|nas}`. Before inserting, the edge function calls `find_similar_whisky()` (pg_trgm, threshold 0.7) to catch near-duplicates from different API sources. Merged duplicates keep `canonical_id` pointing to the canonical record; queries filter `canonical_id IS NULL`.

**Auth token storage**
Supabase session tokens go into `expo-secure-store` (encrypted keychain / keystore) instead of AsyncStorage. The 2048-byte SecureStore limit is sufficient for JWTs.

**Rating**
0–10 in 0.5 increments, stored as `NUMERIC(3,1)`. Displayed as a tap-based slider (no drag dependency needed).

## Refresh generated types

After schema changes:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```
