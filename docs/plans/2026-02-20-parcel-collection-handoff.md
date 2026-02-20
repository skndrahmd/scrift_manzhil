# Parcel Collection Handoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "Mark as Collected" button with a "Collect & Notify" flow that records the collector's name, phone, and CNIC, sends a WhatsApp notification to the parcel owner, and marks the parcel as collected.

**Architecture:** Add 3 new nullable columns to the `parcels` table. Create a dedicated `/api/parcels/collect` route that atomically updates the parcel and sends the notification. Replace the UI button with a modal form.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL), Twilio WhatsApp, Radix UI dialogs

---

### Task 1: Database Migration

**Files:**
- Run SQL in Supabase SQL Editor (no file to create — just run the statement)

**Step 1: Run this SQL in your Supabase project SQL Editor**

```sql
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS collector_name TEXT,
  ADD COLUMN IF NOT EXISTS collector_phone TEXT,
  ADD COLUMN IF NOT EXISTS collector_cnic TEXT;
```

**Step 2: Verify the columns exist**

In Supabase Table Editor, open the `parcels` table and confirm the 3 new columns appear (nullable, no default).

**Step 3: Commit a note**

```bash
git commit --allow-empty -m "chore: add collector columns to parcels table (run migration in Supabase)"
```

---

### Task 2: Update the Parcel TypeScript Type

**Files:**
- Modify: `lib/supabase/types.ts:233-246`

**Step 1: Open `lib/supabase/types.ts` and find the `Parcel` type (around line 233)**

It currently looks like:
```typescript
export type Parcel = {
  id: string
  resident_id: string
  description: string | null
  sender_name: string | null
  courier_name: string | null
  image_url: string
  status: "pending" | "collected" | "returned"
  notified_at: string | null
  collected_at: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}
```

**Step 2: Add the 3 new fields before `profiles?`**

```typescript
export type Parcel = {
  id: string
  resident_id: string
  description: string | null
  sender_name: string | null
  courier_name: string | null
  image_url: string
  status: "pending" | "collected" | "returned"
  notified_at: string | null
  collected_at: string | null
  created_at: string
  updated_at: string
  collector_name: string | null
  collector_phone: string | null
  collector_cnic: string | null
  profiles?: Profile
}
```

**Step 3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(parcels): add collector fields to Parcel type"
```

---

### Task 3: Add the Collection Notification Function

**Files:**
- Modify: `lib/twilio/notifications/parcel.ts`

**Step 1: Open `lib/twilio/notifications/parcel.ts`**

The file currently has one exported interface (`ParcelArrivalParams`) and one exported function (`sendParcelArrivalNotification`). Leave all existing code untouched.

**Step 2: Append the new interface and function at the bottom of the file**

```typescript
export interface ParcelCollectionParams {
    phone: string
    residentName: string
    collectorName: string
    collectorPhone: string
    collectorCnic: string
}

/**
 * Send parcel collection notification to resident
 * Sent when admin records who collected the parcel
 */
export async function sendParcelCollectionNotification(
    params: ParcelCollectionParams
): Promise<TwilioResult> {
    const { phone, residentName, collectorName, collectorPhone, collectorCnic } = params

    const templateSid = await getTemplateSid("parcel_collection")
    const templateVariables = {
        "1": residentName || "Resident",
        "2": collectorName,
        "3": collectorCnic,
        "4": collectorPhone,
    }

    const fallbackMessage = `📦 *Parcel Collected*

Hi ${residentName || "Resident"}, your parcel has been collected by:

Name: ${collectorName}
Phone: ${collectorPhone}
CNIC: ${collectorCnic}

— Manzhil`

    return sendWithFallback(phone, templateSid, templateVariables, fallbackMessage)
}
```

**Step 3: Commit**

```bash
git add lib/twilio/notifications/parcel.ts
git commit -m "feat(parcels): add sendParcelCollectionNotification function"
```

---

### Task 4: Create the Collect API Route

**Files:**
- Create: `app/api/parcels/collect/route.ts`

**Step 1: Create the directory and file**

Create `app/api/parcels/collect/route.ts` with this content:

```typescript
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendParcelCollectionNotification } from "@/lib/twilio/notifications/parcel"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export async function POST(request: Request) {
    const { authenticated, error: authError } = await verifyAdminAccess("parcels")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const { parcelId, collectorName, collectorPhone, collectorCnic } = await request.json()

        if (!parcelId || !collectorName || !collectorPhone || !collectorCnic) {
            return NextResponse.json(
                { success: false, error: "Parcel ID, collector name, phone, and CNIC are required" },
                { status: 400 }
            )
        }

        // Fetch parcel with resident profile
        const { data: parcel, error: fetchError } = await supabaseAdmin
            .from("parcels")
            .select(`
                *,
                profiles (
                    id,
                    name,
                    phone_number,
                    apartment_number
                )
            `)
            .eq("id", parcelId)
            .single()

        if (fetchError || !parcel) {
            console.error("[Parcel Collect] Fetch error:", fetchError)
            return NextResponse.json(
                { success: false, error: "Parcel not found" },
                { status: 404 }
            )
        }

        if (!parcel.profiles?.phone_number) {
            return NextResponse.json(
                { success: false, error: "Resident phone number not found" },
                { status: 400 }
            )
        }

        // Update parcel: mark as collected and store collector info
        const { data: updatedParcel, error: updateError } = await supabaseAdmin
            .from("parcels")
            .update({
                status: "collected",
                collected_at: new Date().toISOString(),
                collector_name: collectorName,
                collector_phone: collectorPhone,
                collector_cnic: collectorCnic,
            })
            .eq("id", parcelId)
            .select()
            .single()

        if (updateError) {
            console.error("[Parcel Collect] Update error:", updateError)
            return NextResponse.json(
                { success: false, error: "Failed to update parcel" },
                { status: 500 }
            )
        }

        // Send WhatsApp notification to resident
        const result = await sendParcelCollectionNotification({
            phone: parcel.profiles.phone_number,
            residentName: parcel.profiles.name || "Resident",
            collectorName,
            collectorPhone,
            collectorCnic,
        })

        if (!result.ok) {
            console.error("[Parcel Collect] Notification failed:", result.error)
            // Parcel is already marked collected — return success but warn about notification
            return NextResponse.json({
                success: true,
                parcel: updatedParcel,
                message: "Parcel marked as collected but notification failed to send",
                notificationFailed: true,
            })
        }

        return NextResponse.json({
            success: true,
            parcel: updatedParcel,
            message: "Parcel collected and resident notified",
        })
    } catch (error) {
        console.error("[Parcel Collect] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}
```

**Step 2: Commit**

```bash
git add app/api/parcels/collect/route.ts
git commit -m "feat(parcels): add /api/parcels/collect route"
```

---

### Task 5: Update the WhatsApp Templates Seed SQL

**Files:**
- Modify: `sql/database-seed-whatsapp-templates.sql`

**Step 1: Find the parcel section (around line 50-54) which currently reads:**

```sql
-- Parcel Templates (1)
INSERT INTO whatsapp_templates (...)
VALUES
  ('parcel_arrival', ...)
ON CONFLICT (template_key) DO NOTHING;
```

**Step 2: Update the comment and add the new template to the same INSERT block**

Change `-- Parcel Templates (1)` to `-- Parcel Templates (2)` and add the new row before `ON CONFLICT`:

```sql
-- Parcel Templates (2)
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('parcel_arrival', 'Parcel Arrival', 'Notification sent to residents when a parcel/delivery arrives at reception', 'parcel', 'TWILIO_PARCEL_ARRIVAL_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Description","description":"Parcel description or Package","example":"Amazon Delivery"},{"key":"3","label":"Image URL","description":"Photo of the parcel","example":"https://storage.supabase.co/parcels/img.jpg"}]'::jsonb, 'Sent when admin registers a new parcel from the parcels page', 'lib/twilio/notifications/parcel.ts', NULL, 1),
  ('parcel_collection', 'Parcel Collection', 'Notification sent to residents when someone collects their parcel at reception', 'parcel', 'TWILIO_PARCEL_COLLECTION_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Collector Name","description":"Name of the person who collected the parcel","example":"Ali Khan"},{"key":"3","label":"Collector CNIC","description":"CNIC of the collector","example":"42101-1234567-1"},{"key":"4","label":"Collector Phone","description":"Phone number of the collector","example":"+923001234567"}]'::jsonb, 'Sent when admin records parcel collection via the Collect & Notify flow', 'lib/twilio/notifications/parcel.ts', NULL, 2)
ON CONFLICT (template_key) DO NOTHING;
```

**Step 3: Add the message_body_draft UPDATE near line 137 (after the parcel_arrival update)**

After this line:
```sql
WHERE template_key = 'parcel_arrival' AND message_body_draft IS NULL;
```

Add:
```sql
UPDATE whatsapp_templates SET message_body_draft = E'Hello, this is Manzhil by Scrift.\n\nHi {{1}}, your parcel has been collected by {{2}} (CNIC: {{3}}, Phone: {{4}}).\n\nIf you did not authorize this collection, please contact building management immediately.'
WHERE template_key = 'parcel_collection' AND message_body_draft IS NULL;
```

**Step 4: Run the new INSERT in Supabase SQL Editor**

```sql
INSERT INTO whatsapp_templates (template_key, name, description, category, env_var_name, variables, trigger_description, trigger_source, fallback_message, sort_order)
VALUES
  ('parcel_collection', 'Parcel Collection', 'Notification sent to residents when someone collects their parcel at reception', 'parcel', 'TWILIO_PARCEL_COLLECTION_TEMPLATE_SID', '[{"key":"1","label":"Resident Name","description":"Full name of the resident","example":"Ahmed Khan"},{"key":"2","label":"Collector Name","description":"Name of the person who collected the parcel","example":"Ali Khan"},{"key":"3","label":"Collector CNIC","description":"CNIC of the collector","example":"42101-1234567-1"},{"key":"4","label":"Collector Phone","description":"Phone number of the collector","example":"+923001234567"}]'::jsonb, 'Sent when admin records parcel collection via the Collect & Notify flow', 'lib/twilio/notifications/parcel.ts', NULL, 2)
ON CONFLICT (template_key) DO NOTHING;
```

**Step 5: Commit**

```bash
git add sql/database-seed-whatsapp-templates.sql
git commit -m "feat(parcels): add parcel_collection WhatsApp template seed entry"
```

---

### Task 6: Update the UI — Add State and Collection Handler

**Files:**
- Modify: `components/admin/parcels-table.tsx`

This is the most involved task. Do it in sub-steps.

**Step 1: Add new state variables**

Find the existing state declarations block (lines 53-71):
```typescript
const [isNotifying, setIsNotifying] = useState(false)
```

After that line, add:
```typescript
const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
const [collectingParcel, setCollectingParcel] = useState<Parcel | null>(null)
const [collectorName, setCollectorName] = useState("")
const [collectorPhone, setCollectorPhone] = useState("")
const [collectorCnic, setCollectorCnic] = useState("")
const [isCollecting, setIsCollecting] = useState(false)
```

**Step 2: Add the handler to open the modal**

Find `handleResendNotification` (around line 233). After that function ends (after the closing `}`), add:

```typescript
// Open the collect & notify modal
const openCollectModal = (parcel: Parcel) => {
    setCollectingParcel(parcel)
    setCollectorName("")
    setCollectorPhone("")
    setCollectorCnic("")
    setIsCollectModalOpen(true)
}

// Handle collect & notify submission
const handleCollectAndNotify = async () => {
    if (!collectingParcel) return
    if (!collectorName.trim() || !collectorPhone.trim() || !collectorCnic.trim()) {
        toast({ title: "All fields are required", variant: "destructive" })
        return
    }

    setIsCollecting(true)
    try {
        const response = await fetch("/api/parcels/collect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                parcelId: collectingParcel.id,
                collectorName: collectorName.trim(),
                collectorPhone: collectorPhone.trim(),
                collectorCnic: collectorCnic.trim(),
            }),
        })
        const data = await response.json()

        if (data.success) {
            toast({
                title: data.notificationFailed ? "Parcel Collected (notification failed)" : "Parcel Collected",
                description: data.notificationFailed
                    ? "Parcel marked as collected but WhatsApp notification could not be sent."
                    : "Resident has been notified of the collection.",
            })
            setIsCollectModalOpen(false)
            fetchParcels()
        } else {
            toast({ title: "Error", description: data.error || "Failed to process collection", variant: "destructive" })
        }
    } catch {
        toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
    } finally {
        setIsCollecting(false)
    }
}
```

**Step 3: Remove `handleMarkCollected`**

Find and delete the entire `handleMarkCollected` function (around lines 265-291 — it starts with `// Handle mark as collected` and ends with the closing `}`).

**Step 4: Commit**

```bash
git add components/admin/parcels-table.tsx
git commit -m "feat(parcels): add collect modal state and handlers"
```

---

### Task 7: Update the UI — Replace Buttons and Add Modal

**Files:**
- Modify: `components/admin/parcels-table.tsx`

**Step 1: Replace the desktop "Mark as Collected" button (lines 462-470)**

Find this block in the desktop table view:
```tsx
<Button
    variant="outline"
    size="sm"
    onClick={() => handleMarkCollected(parcel)}
    className="h-8 px-3 border-green-300 hover:bg-green-50 text-green-600"
    title="Mark as Collected"
>
    <CheckCircle className="h-4 w-4" />
</Button>
```

Replace with:
```tsx
<Button
    variant="outline"
    size="sm"
    onClick={() => openCollectModal(parcel)}
    className="h-8 px-3 border-green-300 hover:bg-green-50 text-green-600"
    title="Collect & Notify"
>
    <CheckCircle className="h-4 w-4" />
</Button>
```

**Step 2: Replace the mobile "Collected" button (lines 545-553)**

Find this block in the mobile card view:
```tsx
<Button
    variant="outline"
    size="sm"
    onClick={() => handleMarkCollected(parcel)}
    className="h-8 text-xs border-green-300 text-green-600"
>
    <CheckCircle className="h-3.5 w-3.5 mr-1" />
    Collected
</Button>
```

Replace with:
```tsx
<Button
    variant="outline"
    size="sm"
    onClick={() => openCollectModal(parcel)}
    className="h-8 text-xs border-green-300 text-green-600"
>
    <CheckCircle className="h-3.5 w-3.5 mr-1" />
    Collect
</Button>
```

**Step 3: Add the Collect & Notify modal**

Find the closing `</div>` that wraps all the existing modals (after the Register New Parcel modal's closing `</Dialog>`). Add this new `<Dialog>` block just before the component's final `return` closing tag:

```tsx
{/* Collect & Notify Modal */}
<Dialog open={isCollectModalOpen} onOpenChange={(open) => { if (!isCollecting) setIsCollectModalOpen(open) }}>
    <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-manzhil-dark">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Collect & Notify
            </DialogTitle>
            <DialogDescription>
                Enter the details of the person collecting this parcel. The resident will be notified via WhatsApp.
            </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
            <div className="space-y-2">
                <Label htmlFor="collector-name">Collector Name <span className="text-red-500">*</span></Label>
                <Input
                    id="collector-name"
                    placeholder="Full name"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    disabled={isCollecting}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="collector-phone">Collector Phone <span className="text-red-500">*</span></Label>
                <Input
                    id="collector-phone"
                    placeholder="+92300..."
                    value={collectorPhone}
                    onChange={(e) => setCollectorPhone(e.target.value)}
                    disabled={isCollecting}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="collector-cnic">Collector CNIC <span className="text-red-500">*</span></Label>
                <Input
                    id="collector-cnic"
                    placeholder="42101-1234567-1"
                    value={collectorCnic}
                    onChange={(e) => setCollectorCnic(e.target.value)}
                    disabled={isCollecting}
                />
            </div>
        </div>

        <DialogFooter>
            <Button
                variant="outline"
                onClick={() => setIsCollectModalOpen(false)}
                disabled={isCollecting}
            >
                Cancel
            </Button>
            <Button
                onClick={handleCollectAndNotify}
                disabled={isCollecting || !collectorName.trim() || !collectorPhone.trim() || !collectorCnic.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
            >
                {isCollecting ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    "Confirm Collection"
                )}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
```

**Step 4: Commit**

```bash
git add components/admin/parcels-table.tsx
git commit -m "feat(parcels): replace mark-collected button with collect-and-notify modal"
```

---

### Task 8: Manual Test

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Test the full flow**

1. Navigate to `/admin/parcels`
2. Find a parcel with status "Pending"
3. Confirm the green CheckCircle button is present (no "Mark as Collected" text)
4. Click the button — the "Collect & Notify" modal should open
5. Try submitting with empty fields — button should stay disabled
6. Fill in all 3 fields and click "Confirm Collection"
7. Verify: parcel disappears from pending list, status shows "Collected"
8. Check the resident's WhatsApp for the collection notification
9. Verify the "Notify" (Bell) button on other pending parcels still works as a reminder

**Step 3: Build check**

```bash
npm run build
```

Expected: no TypeScript or build errors.

**Step 4: Final commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "fix(parcels): address any build warnings"
```
