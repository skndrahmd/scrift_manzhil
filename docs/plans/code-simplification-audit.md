# Code Simplification Audit Plan

## Context

This plan addresses a comprehensive code simplification audit of the Manzhil BMS codebase. The goal is to improve maintainability and readability while preserving all existing functionality. The analysis identified significant code duplication, inconsistent patterns, and opportunities for consolidation across the `lib/`, `app/api/`, and `components/` directories.

**Key Statistics:**
- 5 duplicate `formatDate` implementations
- 7 duplicate `formatTime` implementations
- 115 auth check duplications across 46 files
- 80% overlap between bulk-import parsers
- 10+ components with nearly identical table patterns

---

## Phase 1: Core Utility Consolidation (lib/)

### 1.1 Date/Time Formatting Consolidation

**Files to modify:**
- `lib/date/formatting.ts` - Add canonical implementations
- `lib/twilio/formatters.ts` - Remove duplicates, import from lib/date
- `lib/webhook/utils.ts` - Remove duplicates, import from lib/date
- `lib/pdf/theme.ts` - Remove duplicates, import from lib/date

**Changes:**
1. Create canonical `formatDate()` in `lib/date/formatting.ts` with both sync and async variants
2. Create canonical `formatTime()` with format options (12h/24h)
3. Create `formatSubcategory()` utility
4. Update all imports in other modules

### 1.2 Validation Functions Consolidation

**Files to modify:**
- `lib/validation/resident.ts` - Keep as single source of truth
- `lib/webhook/utils.ts` - Remove duplicate validators

**Changes:**
1. Export `normalizePhoneNumber()` and `validateCNIC()` from `lib/validation/resident.ts`
2. Remove duplicate implementations from `lib/webhook/utils.ts`
3. Update imports

### 1.3 Bulk Import Base Module

**Files to modify:**
- `lib/bulk-import/base.ts` - NEW FILE
- `lib/bulk-import/parser.ts` - Refactor to use base
- `lib/bulk-import-units/parser.ts` - Refactor to use base
- `lib/bulk-import/validation.ts` - Refactor to use base
- `lib/bulk-import-units/validation.ts` - Refactor to use base

**Changes:**
1. Create `lib/bulk-import/base.ts` with:
   - `normalizeHeader()` function
   - `mapHeader()` function
   - `mapHeaders()` function
   - `generateErrorReport()` function
   - `downloadErrorReport()` function
2. Refactor resident and unit parsers to extend/import from base
3. Eliminates ~80% code duplication

### 1.4 PDF Utilities Cleanup

**Files to modify:**
- `lib/pdf/utils.ts` - Keep utilities
- `lib/pdf/reporting.ts` - Remove duplicate functions

**Changes:**
1. Remove duplicate `periodLabel()` from `lib/pdf/reporting.ts`
2. Remove duplicate `filterByPeriod()` from `lib/pdf/reporting.ts`
3. Import from `lib/pdf/utils.ts` instead

---

## Phase 2: API Route Simplification (app/api/)

### 2.1 Authentication Wrapper Utility

**Files to modify:**
- `lib/auth/api-helpers.ts` - NEW FILE
- 46 API route files

**Changes:**
1. Create `lib/auth/api-helpers.ts` with:
   ```typescript
   export async function withAdminAuth<T>(
     pageKey: PageKey,
     handler: (adminUser: AdminUser) => Promise<T>
   ): Promise<NextResponse>
   ```
2. Create error response helpers:
   ```typescript
   export function apiError(message: string, status: number): NextResponse
   export function apiSuccess(data: object): NextResponse
   ```
3. Create ServiceError handler:
   ```typescript
   export function handleServiceError(error: unknown): NextResponse
   ```

### 2.2 Standardize Response Formats

**Files to modify:**
- `lib/api/response.ts` - NEW FILE
- All API routes using `new Response()`

**Changes:**
1. Create `lib/api/response.ts` with standardized response helpers
2. Convert all `new Response()` calls to `NextResponse.json()`
3. Standardize success/error response shapes

### 2.3 Validation Utilities

**Files to modify:**
- `lib/api/validation.ts` - NEW FILE
- 10+ API routes with repetitive validation

**Changes:**
1. Create validation helpers:
   - `requireArray(items: unknown): asserts items is unknown[]`
   - `requireId(id: unknown): asserts id is string`
   - `requirePhone(phone: string): asserts valid`
   - `requireStatus(status: string, valid: string[]): asserts valid`
2. Update routes to use helpers

### 2.4 Query Pattern Helpers

**Files to modify:**
- `lib/db/queries.ts` - NEW FILE
- Routes with duplicate query patterns

**Changes:**
1. Create helper for duplicate checking:
   ```typescript
   export async function checkDuplicates(
     table: string,
     field: string,
     values: string[]
   ): Promise<string[]>
   ```
2. Create helper for fetching related entities:
   ```typescript
   export async function fetchWithProfile(
     table: string,
     id: string
   ): Promise<EntityWithProfile>
   ```

---

## Phase 3: Component Simplification (components/)

### 3.1 Status Badge Utility

**Files to modify:**
- `lib/utils/status-badge.ts` - NEW FILE
- 5 components with duplicate status badge logic

**Changes:**
1. Create unified status badge variants:
   ```typescript
   export function getStatusVariant(
     status: string,
     type: 'booking' | 'complaint' | 'visitor' | 'parcel' | 'log'
   ): 'default' | 'secondary' | 'destructive' | 'outline'
   ```
2. Update all table components to import from utility

### 3.2 Custom Hooks Extraction

**Files to modify:**
- `hooks/use-table-filters.ts` - NEW FILE
- `hooks/use-analytics-data.ts` - NEW FILE
- `hooks/use-broadcast-state.ts` - NEW FILE
- Multiple table components

**Changes:**
1. Extract `useTableFilters()` for filter state management
2. Extract `useAnalyticsData()` for analytics calculations
3. Extract `useBroadcastState()` for broadcast form state
4. Reduce component complexity

### 3.3 Large Component Refactoring

**Components to split:**

| Component | Lines | Split Into |
|-----------|-------|------------|
| `whatsapp-template-manager.tsx` | 1351 | `TemplateList`, `TemplateWizard`, `TemplateTester` |
| `analytics-dashboard.tsx` | 890 | `RevenueChart`, `OccupancyChart`, `KPICards` |
| `parcels-table.tsx` | 965 | `ParcelsList`, `ParcelViewModal`, `ParcelNotifyModal` |
| `residents-table.tsx` | 868 | `ResidentsList`, `ResidentAddModal`, `ResidentEditModal` |

### 3.4 Standardize Loading State Naming

**Changes:**
1. Use `[isXLoading, setIsXLoading]` pattern consistently
2. Replace `saving`, `submitting` with `isSaving`, `isSubmitting`
3. Update 14+ components

---

## Phase 4: Unused Code Cleanup

### 4.1 Remove Unused UI Components

**Files to verify and potentially remove:**
- `components/ui/slider.tsx` (0 usages)
- `components/ui/radio-group.tsx` (0 usages)
- `components/ui/sonner.tsx` (0 usages outside sidebar)
- `components/ui/skeleton.tsx` (0 usages)
- `components/ui/toggle.tsx` (only in toggle-group)
- `components/ui/toggle-group.tsx` (self-reference only)

### 4.2 Remove Duplicate Type Definitions

**Files to check:**
- Look for duplicate interfaces across components
- Consolidate shared types in `lib/types/`

---

## Verification Strategy

### After Each Phase:

1. **Run tests:** `npm run test`
2. **Build check:** `npm run build`
3. **Lint check:** `npm run lint`
4. **Manual testing:** Test affected features in browser

### End-to-End Verification:

1. Admin dashboard loads correctly
2. All CRUD operations work (units, residents, bookings, complaints, parcels, visitors)
3. WhatsApp webhook processes messages correctly
4. Broadcast messaging works with rate limiting
5. PDF generation works for all report types
6. Bulk import works for both residents and units

---

## Implementation Order

1. **Phase 1** (Core Utilities) - Low risk, high impact
2. **Phase 2** (API Routes) - Medium risk, requires careful testing
3. **Phase 3** (Components) - Medium risk, visual changes
4. **Phase 4** (Cleanup) - Low risk, reduces bundle size

---

## Risk Mitigation

1. **Create backup branch** before starting
2. **One module at a time** - Complete and test each before moving on
3. **Preserve existing tests** - Run after each change
4. **Keep functionality identical** - Only simplify, don't change behavior
5. **Update imports systematically** - Use grep to find all usages

---

## Files to Create

| File | Purpose |
|------|---------|
| `lib/bulk-import/base.ts` | Shared bulk import utilities |
| `lib/auth/api-helpers.ts` | API route helpers |
| `lib/api/response.ts` | Standardized response utilities |
| `lib/api/validation.ts` | Request validation utilities |
| `lib/db/queries.ts` | Shared query patterns |
| `lib/utils/status-badge.ts` | Status badge utilities |
| `hooks/use-table-filters.ts` | Table filter hook |
| `hooks/use-analytics-data.ts` | Analytics data hook |
| `hooks/use-broadcast-state.ts` | Broadcast state hook |