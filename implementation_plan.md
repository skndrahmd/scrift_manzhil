# Implementation Plan

## Overview

Add an admin panel page under Settings that allows super admins to enable/disable WhatsApp bot main menu options, reorder them via drag-and-drop or up/down buttons, and edit the display text (label + emoji) of each option — all persisted to the database so changes take effect in real time for the WhatsApp bot.

Currently, the main menu options are hardcoded in `lib/webhook/config.ts` as the `MAIN_MENU_OPTIONS` array, and the router in `lib/webhook/router.ts` uses a hardcoded `switch` statement mapping option numbers 1–12 to handler functions. The menu display in `lib/webhook/menu.ts` reads from this static array. To make the menu dynamic, we need to:

1. Create a new database table `menu_options` to store each option's key, label, emoji, enabled status, sort order, and the handler action it maps to.
2. Create API endpoints to CRUD these menu options.
3. Create an admin UI component for managing menu options.
4. Modify the webhook system (`config.ts`, `menu.ts`, `router.ts`) to read from the database instead of the hardcoded array.
5. Add a new settings tab and page in the admin panel.

## [Types]

New TypeScript types for the menu options system.

### New Type: `MenuOption` (in `lib/webhook/types.ts`)
```typescript
export interface MenuOption {
  id: string              // UUID primary key
  action_key: string      // Internal action identifier (e.g., "register_complaint", "check_status")
  label: string           // Display label (e.g., "Register Complaint")
  emoji: string           // Emoji prefix (e.g., "📝")
  is_enabled: boolean     // Whether this option appears in the menu
  sort_order: number      // Display order (1-based)
  handler_type: string    // Maps to FlowType or special handler (e.g., "complaint", "status", "maintenance_status", "profile_info", "emergency_contacts")
  created_at: string
  updated_at: string
}
```

### New Type: `MenuOptionUpdate` (in API request body)
```typescript
interface MenuOptionUpdate {
  label?: string
  emoji?: string
  is_enabled?: boolean
  sort_order?: number
}
```

### New Type: `MenuOptionReorder` (in API request body for bulk reorder)
```typescript
interface MenuOptionReorder {
  options: { id: string; sort_order: number; is_enabled: boolean }[]
}
```

## [Files]

File modifications required for the full implementation.

### New Files
1. **`sql/database-menu-options-schema.sql`** — SQL schema for `menu_options` table with seed data
2. **`app/api/menu-options/route.ts`** — GET (list all) and PUT (bulk update order/enabled) endpoints
3. **`app/api/menu-options/[id]/route.ts`** — PATCH (update single option label/emoji/enabled)
4. **`components/admin/menu-options-manager.tsx`** — Admin UI component for managing menu options
5. **`app/admin/settings/menu-options/page.tsx`** — Admin page wrapper

### Modified Files
1. **`lib/webhook/config.ts`** — Add `getMenuOptions()` async function that reads from DB, keep `MAIN_MENU_OPTIONS` as fallback
2. **`lib/webhook/menu.ts`** — Modify `getMainMenu()` to use dynamic menu options from DB
3. **`lib/webhook/router.ts`** — Modify `handleMainMenu()` to use dynamic action mapping from DB instead of hardcoded switch
4. **`lib/webhook/types.ts`** — Add `MenuOption` type
5. **`lib/webhook/index.ts`** — Export new `getMenuOptions` function
6. **`lib/webhook/message-defaults.ts`** — Update `labels.main_menu_options` default to note it's now dynamic
7. **`components/admin/settings-form.tsx`** — Add "Menu Options" tab with link to the new page

## [Functions]

Function modifications required.

### New Functions

1. **`getMenuOptions()`** in `lib/webhook/config.ts`
   - Signature: `async function getMenuOptions(): Promise<MenuOption[]>`
   - Purpose: Fetches enabled menu options from `menu_options` table, ordered by `sort_order`. Falls back to `MAIN_MENU_OPTIONS` if DB fails.
   - Returns only enabled options.

2. **`getAllMenuOptions()`** in `lib/webhook/config.ts`
   - Signature: `async function getAllMenuOptions(): Promise<MenuOption[]>`
   - Purpose: Fetches ALL menu options (including disabled) for admin UI. Ordered by `sort_order`.

3. **`getMenuActionMap()`** in `lib/webhook/config.ts`
   - Signature: `async function getMenuActionMap(): Promise<Map<string, string>>`
   - Purpose: Returns a map of menu position number → handler_type for the router. E.g., `"1" → "complaint"`, `"2" → "status"`.

4. **`GET /api/menu-options`** in `app/api/menu-options/route.ts`
   - Returns all menu options (including disabled) for admin UI.
   - Requires super_admin auth.

5. **`PUT /api/menu-options`** in `app/api/menu-options/route.ts`
   - Bulk update: accepts array of `{ id, sort_order, is_enabled }` to reorder and toggle options.
   - Requires super_admin auth.

6. **`PATCH /api/menu-options/[id]`** in `app/api/menu-options/[id]/route.ts`
   - Update single option's `label`, `emoji`, or `is_enabled`.
   - Requires super_admin auth.

### Modified Functions

1. **`getMainMenu()`** in `lib/webhook/menu.ts`
   - Current: Uses hardcoded `MAIN_MENU_OPTIONS` array from config.
   - Change: Call `getMenuOptions()` to get enabled options from DB. Build menu string from dynamic data. Update `labels.main_menu_options` label fetching to handle dynamic count.

2. **`handleMainMenu()`** in `lib/webhook/router.ts`
   - Current: Hardcoded `switch` statement with cases "1" through "12".
   - Change: Call `getMenuActionMap()` to get dynamic mapping. Use the map to resolve the user's numeric choice to a `handler_type`, then dispatch to the appropriate handler function. Keep a static `ACTION_HANDLERS` map from handler_type → handler function.

3. **`processMessage()`** in `lib/webhook/router.ts`
   - Current: Uses hardcoded `String(12)` for `max_option` in invalid selection message.
   - Change: Get dynamic count from `getMenuOptions()`.

## [Classes]

No new classes required. The existing `ServiceError` pattern is not needed here.

## [Dependencies]

No new npm dependencies required. The implementation uses existing packages:
- Supabase client for DB operations
- Existing Radix UI components for the admin UI
- Lucide React icons (already installed)

## [Testing]

### Manual Testing
1. Verify the SQL migration creates the table and seeds data correctly.
2. Test API endpoints via curl:
   - `GET /api/menu-options` returns all 12 options
   - `PUT /api/menu-options` reorders options correctly
   - `PATCH /api/menu-options/[id]` updates label/emoji
3. Test the admin UI:
   - Options display in correct order
   - Toggle enable/disable works
   - Reorder (move up/down) works
   - Edit label/emoji works
   - Changes persist after page refresh
4. Test the WhatsApp bot:
   - Send "0" to get main menu — verify it shows only enabled options in correct order
   - Select an option by number — verify correct handler is invoked
   - Disable an option — verify it disappears from menu
   - Reorder options — verify new numbering works correctly

### Existing Test Modifications
- No existing tests directly test the hardcoded menu options, so no test modifications needed.

## [Implementation Order]

Sequential implementation steps to minimize conflicts.

1. **Step 1: Create SQL schema** — Create `sql/database-menu-options-schema.sql` with table definition and seed data for all 12 current menu options.

2. **Step 2: Add MenuOption type** — Add the `MenuOption` interface to `lib/webhook/types.ts` and export from `lib/webhook/index.ts`.

3. **Step 3: Add DB fetch functions to config.ts** — Add `getMenuOptions()`, `getAllMenuOptions()`, and `getMenuActionMap()` to `lib/webhook/config.ts`. Keep `MAIN_MENU_OPTIONS` as fallback.

4. **Step 4: Modify menu.ts** — Update `getMainMenu()` to use `getMenuOptions()` instead of the hardcoded array.

5. **Step 5: Modify router.ts** — Update `handleMainMenu()` to use dynamic action mapping via `getMenuActionMap()` instead of the hardcoded switch statement. Create a static `ACTION_HANDLERS` map.

6. **Step 6: Create API endpoints** — Create `app/api/menu-options/route.ts` (GET + PUT) and `app/api/menu-options/[id]/route.ts` (PATCH).

7. **Step 7: Create admin UI component** — Create `components/admin/menu-options-manager.tsx` with the full management interface.

8. **Step 8: Create admin page** — Create `app/admin/settings/menu-options/page.tsx`.

9. **Step 9: Add settings tab** — Add "Menu Options" tab to `components/admin/settings-form.tsx`.

10. **Step 10: Update webhook index exports** — Export new functions from `lib/webhook/index.ts`.
