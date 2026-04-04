# Developer Control Panel - Feature Tier Management

## Context

Implement a developer control panel that controls which features are available per Manzhil deployment instance. Different pricing tiers (Free, Freemium, Paid) restrict admin pages, settings tabs, WhatsApp bot flows, and notification toggles. The panel lives at a secret URL (`/admin/dev`) with its own auth, separate from admin auth.

**Default state:** `not_configured` — all features locked until a tier is set.

## Architecture

```mermaid
flowchart TD
    subgraph "Request Flow"
        REQ[Incoming Request] --> MW[middleware.ts]
        MW -->|/admin/dev/*| DEV_PASS[Skip tier check]
        MW -->|other /admin/*| TIER{Tier check}
        TIER -->|not_configured| UNAUTH[/admin/unauthorized]
        TIER -->|page not in tier| REDIRECT[First enabled page]
        TIER -->|page in tier| RBAC[Existing RBAC check]
    end

    subgraph "Data Flow"
        DB[(feature_tiers table)] -->|60s cache| LIB[lib/tier-config.ts]
        LIB --> MW
        LIB --> SIDEBAR[Sidebar filtering]
        LIB --> WEBHOOK[Webhook flow filtering]
        LIB --> STAFF[Staff notification toggles]
        LIB --> SETTINGS[Settings tab filtering]
    end
```

## Implementation Order

### 1. Database Schema — `sql/database-feature-tiers.sql`

Two tables:

```sql
-- Single-row developer credentials
CREATE TABLE developer_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single-row tier config per instance
CREATE TABLE feature_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL DEFAULT 'not_configured',
  enabled_pages JSONB NOT NULL DEFAULT '[]',
  enabled_settings_pages JSONB NOT NULL DEFAULT '[]',
  enabled_flows JSONB NOT NULL DEFAULT '[]',
  enabled_notification_toggles JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce single row
CREATE UNIQUE INDEX feature_tiers_single_row ON feature_tiers ((true));

-- Seed default
INSERT INTO feature_tiers (tier_name) VALUES ('not_configured');

-- RLS: only service role can read/write
ALTER TABLE developer_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_tiers ENABLE ROW LEVEL SECURITY;
```

Also add these tables to `database-complete-schema.sql`.

### 2. Core Module — `lib/tier-config.ts` (new file)

Constants defining all toggleable keys:

| Category | Keys |
|----------|------|
| `PAGE_KEYS` | `dashboard`, `residents`, `units`, `bookings`, `complaints`, `visitors`, `parcels`, `analytics`, `feedback`, `accounting`, `broadcast`, `settings` |
| `SETTINGS_TAB_KEYS` | `booking`, `staff`, `bot`, `templates`, `languages`, `payments`, `amenities`, `menu-options`, `regional`, `logs` |
| `WHATSAPP_FLOW_KEYS` | `complaint`, `status`, `cancel`, `staff`, `maintenance_status`, `hall`, `visitor`, `feedback`, `payment`, `amenity` (matches `handler_type` in `ACTION_HANDLERS` at `lib/webhook/router.ts:192`) |
| `NOTIFICATION_TOGGLE_KEYS` | `receive_complaint_notifications`, `receive_reminder_notifications`, `receive_daily_reports`, `receive_complaint_status_updates`, `receive_payment_notifications` |

Tier presets (cumulative):

| Tier | Pages | Settings Tabs | Flows | Toggles |
|------|-------|---------------|-------|---------|
| **Free** | dashboard, residents, complaints | booking, staff | complaint, status | receive_complaint_notifications |
| **Freemium** | + units, bookings, visitors, feedback | + amenities, payments | + booking, visitor, feedback, cancel | + receive_reminder_notifications, receive_daily_reports |
| **Paid** | All 12 | All 10 | All 10 | All 5 |

Functions:
- `getTierConfig(): Promise<TierConfig>` — reads `feature_tiers` row, caches 60s in module-level variable
- `clearTierConfigCache(): void` — resets cache (called after dev panel save)
- `isPageEnabled(pageKey: string): Promise<boolean>`
- `isSettingsTabEnabled(tabKey: string): Promise<boolean>`
- `isFlowEnabled(flowKey: string): Promise<boolean>`
- `isNotificationToggleEnabled(toggleKey: string): Promise<boolean>`
- `getEnabledPages(): Promise<string[]>`
- `TIER_PRESETS` — object with Free/Freemium/Paid configs

Uses `supabaseAdmin` from `@/lib/supabase` (service role, bypasses RLS).

### 3. Dev Session — `lib/auth/dev-session.ts` (new file)

Simple cookie-based session (no Supabase Auth):
- `DEV_SESSION_COOKIE = "dev_session"` — httpOnly, 1hr maxAge
- `validateDevCredentials(email, password)` — queries `developer_credentials`, uses bcrypt to compare
- `getDevSession()` — reads cookie, verifies JWT (signed with `SUPABASE_SERVICE_ROLE_KEY` as secret)
- `setDevSession(email)` — creates JWT, sets cookie
- `clearDevSession()` — deletes cookie

Add `bcryptjs` dependency (already edge-compatible, no native bindings).

### 4. API Routes (3 new files)

**`app/api/dev/login/route.ts`** — POST: validate credentials via `validateDevCredentials`, call `setDevSession`, return 200/401

**`app/api/dev/logout/route.ts`** — POST: call `clearDevSession`, return 200

**`app/api/dev/tier/route.ts`**:
- GET: call `getDevSession()` → 401 if none; return `getTierConfig()`
- PATCH: call `getDevSession()` → 401 if none; validate body (tier_name + 4 arrays against known keys); update `feature_tiers` row; call `clearTierConfigCache()`; return updated config

### 5. Dev Panel UI (3 new files)

**`app/admin/dev/layout.tsx`** — Minimal layout that does NOT use the AdminLayout (no sidebar, no auth provider). Just a centered container with Manzhil branding.

**`app/admin/dev/page.tsx`** — Client component:
- On mount, `GET /api/dev/tier` — if 401, show login form; if 200, show tier editor
- Login form: email + password → `POST /api/dev/login` → re-fetch tier
- Tier editor:
  - 3 preset buttons (Free, Freemium, Paid) + Reset button (sets `not_configured`)
  - 4 checkbox sections (pages, settings tabs, flows, notification toggles)
  - Save button → `PATCH /api/dev/tier`
  - Logout button → `POST /api/dev/logout`

**Important:** `/admin/dev` must be excluded from the admin `layout.tsx` wrapping. Since Next.js app router applies `app/admin/layout.tsx` to all `/admin/*` routes, we need `app/admin/dev/layout.tsx` to override it. In Next.js 14, a nested layout replaces the parent's `children` slot but the parent layout still renders. So instead, move the dev panel outside admin: use **`app/dev-panel/page.tsx`** and **`app/api/dev-panel/...`** routes to avoid inheriting the admin layout entirely.

**Revised paths:**
- `app/dev-panel/layout.tsx` — minimal layout
- `app/dev-panel/page.tsx` — login + tier editor
- API routes stay at `app/api/dev/` (API routes have no layout)

### 6. Middleware Integration — `middleware.ts`

**Changes to existing file** (insert tier check AFTER auth, BEFORE RBAC):

1. Add `/dev-panel` to `publicRoutes` array (it has its own auth via dev session cookie)
2. After the super_admin early return (line ~240) and before the pageKey permission check, add tier filtering:

```
// -- Tier gate (applies to both super_admin and staff) --
// Fetch tier config (cached 60s, so import getTierConfig)
// NOTE: middleware runs in Edge Runtime — getTierConfig must be edge-compatible
// If tier_name === 'not_configured', redirect to /admin/unauthorized
// If pageKey exists and is NOT in enabled_pages, redirect to first enabled page
```

**Edge runtime concern:** `middleware.ts` runs in Edge Runtime. `supabaseAdmin` from `lib/supabase/client.ts` uses `createClient` which works in Edge. The 60s cache in `lib/tier-config.ts` uses a module-level variable — this works but resets per cold start (acceptable).

Move the tier check to happen BEFORE the super_admin early return, so tier restrictions apply to everyone:

```typescript
// After adminUser is fetched, before permission checks:
const tierConfig = await getTierConfig()

if (tierConfig.tier_name === 'not_configured') {
  return redirect('/admin/unauthorized')
}

const pageKey = getPageKeyFromPath(pathname)
if (pageKey && !tierConfig.enabled_pages.includes(pageKey)) {
  // Redirect to first enabled page the user has access to
  const firstEnabled = tierConfig.enabled_pages.find(p => 
    adminRole === 'super_admin' || permittedKeySet.has(p)
  )
  if (firstEnabled) redirect to PAGE_KEY_TO_ROUTE[firstEnabled]
  else redirect to /admin/unauthorized
}

// Then continue with existing RBAC logic...
```

### 7. Sidebar Filtering — `components/admin/sidebar.tsx`

**Changes:** The sidebar already filters by RBAC permissions. Add tier filtering as an additional layer.

Add a new prop `enabledPages?: string[]` to `SidebarProps`. In `filteredNavItems` useMemo, add tier filter:

```typescript
// After existing RBAC filter:
if (enabledPages) {
  items = items.filter(item => enabledPages.includes(item.pageKey))
}
```

**In `app/admin/layout.tsx`:** Fetch tier config and pass `enabledPages` to `AdminSidebar`. Since layout is a client component, fetch via API or use a new `/api/dev/tier/enabled-pages` endpoint, or simpler: create a small server component wrapper that fetches tier config and passes it down. 

Simplest approach: add a `useEffect` in `AdminLayoutContent` that fetches `GET /api/dev/tier/pages` (a lightweight public endpoint returning just enabled_pages array — no dev auth needed, it's read-only config). Add this new route:

**`app/api/tier/config/route.ts`** (new) — GET: returns `{ enabled_pages, enabled_settings_tabs, enabled_flows, enabled_notification_toggles, tier_name }` from `getTierConfig()`. No auth required (it's instance config, not sensitive).

### 8. Settings Tab Filtering — `components/admin/settings-form.tsx`

**Changes:** Filter which tabs are rendered based on tier config.

- Fetch tier config (via `useEffect` calling `GET /api/tier/config`)
- Store `enabledSettingsTabs` in state
- Conditionally render each `<TabsTrigger>` and `<TabsContent>` only if the tab key is in `enabledSettingsTabs`

### 9. WhatsApp Flow Filtering — `lib/webhook/router.ts`

**Changes to `handleMainMenu` function (~line 227):**

After resolving `handlerType` from `actionMap`, check tier:

```typescript
if (handlerType) {
  const { isFlowEnabled } = await import('@/lib/tier-config')
  if (!(await isFlowEnabled(handlerType))) {
    return await getMessage(MSG.ERROR_GENERIC, undefined, language)
  }
  // ... existing handler dispatch
}
```

**Changes to `getMenuOptions` in `lib/webhook/config.ts`:**

Filter out menu options whose `handler_type` is not in `enabled_flows`:

```typescript
// After fetching from DB, before returning:
const { getEnabledFlows } = await import('@/lib/tier-config')
const enabledFlows = await getEnabledFlows()
const filtered = data.filter(opt => enabledFlows.includes(opt.handler_type))
```

This hides disabled flows from the menu AND blocks them in the router.

### 10. Staff Notification Toggle Filtering — `components/admin/staff-management.tsx`

**Changes:** In the notification toggles section (~line 465+), conditionally render each checkbox based on tier config.

- Fetch tier config via `GET /api/tier/config` on mount
- Store `enabledToggles` in state
- Wrap each notification checkbox in `{enabledToggles.includes('receive_...') && (...)}`

## Files Summary

| File | Action | What Changes |
|------|--------|-------------|
| `sql/database-feature-tiers.sql` | Create | Schema for `developer_credentials` and `feature_tiers` |
| `database-complete-schema.sql` | Edit | Add both new tables |
| `lib/tier-config.ts` | Create | Tier config cache, helpers, presets, constants |
| `lib/auth/dev-session.ts` | Create | Dev cookie session (JWT + bcrypt) |
| `app/api/dev/login/route.ts` | Create | Dev login endpoint |
| `app/api/dev/logout/route.ts` | Create | Dev logout endpoint |
| `app/api/dev/tier/route.ts` | Create | Tier CRUD endpoint (dev-authed) |
| `app/api/tier/config/route.ts` | Create | Public read-only tier config endpoint |
| `app/dev-panel/layout.tsx` | Create | Minimal layout (no admin wrapper) |
| `app/dev-panel/page.tsx` | Create | Login form + tier configuration editor |
| `middleware.ts` | Edit | Add tier gate before RBAC, add `/dev-panel` to public routes |
| `components/admin/sidebar.tsx` | Edit | Add `enabledPages` prop, filter nav items |
| `app/admin/layout.tsx` | Edit | Fetch tier config, pass `enabledPages` to sidebar |
| `components/admin/settings-form.tsx` | Edit | Filter tabs by `enabled_settings_tabs` |
| `lib/webhook/config.ts` | Edit | Filter `getMenuOptions()` by enabled flows |
| `lib/webhook/router.ts` | Edit | Guard `handleMainMenu` with flow check |
| `components/admin/staff-management.tsx` | Edit | Filter notification toggle checkboxes |
| `package.json` | Edit | Add `bcryptjs` + `@types/bcryptjs` |

## Verification

1. **Build check:** `npm run build` — no type errors
2. **Test suite:** `npm run test` — all existing tests pass
3. **Manual flow:**
   - Visit `/dev-panel` → see login form (no admin layout/sidebar)
   - Login with dev credentials → see tier editor
   - Default state: `not_configured` → all admin pages redirect to `/admin/unauthorized`
   - Set "Free" preset → save → only dashboard/residents/complaints visible in sidebar
   - WhatsApp bot only shows complaint/status flows in menu
   - Staff management only shows `receive_complaint_notifications` toggle
   - Settings page only shows booking/staff tabs
   - Upgrade to "Paid" → all features visible
   - Downgrade back → features hide again
4. **Lint:** `npm run lint`

## Tier Presets Reference

| Tier | Pages | Settings Tabs | Flows | Toggles |
|------|-------|---------------|-------|---------|
| **Free** | dashboard, residents, complaints | booking, staff | complaint, status | receive_complaint_notifications |
| **Freemium** | + units, bookings, visitors, feedback | + amenities, payments | + booking, visitor, feedback, cancel | + receive_reminder_notifications, receive_daily_reports |
| **Paid** | All 12 | All 10 | All 10 | All 5 |

## Security Considerations

1. **Dev panel is URL-only** — No link from any admin page
2. **Separate authentication** — Dev credentials stored separately from admin_users
3. **Session expiration** — 1 hour inactivity timeout
4. **Tier cache** — Cleared immediately on configuration update
5. **Middleware check** — Every request validates tier before page access
6. **Service role only** — Tier tables use RLS, only service role can read/write