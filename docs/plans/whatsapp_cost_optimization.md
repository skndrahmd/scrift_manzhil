 Plan to implement                                                                                                                        │
│                                                                                                                                          │
│ Twilio WhatsApp Messaging Cost Optimization Plan                                                                                         │
│                                                                                                                                          │
│ Context                                                                                                                                  │
│                                                                                                                                          │
│ The system sends an estimated ~3,000+ WhatsApp messages/month for a 50-unit building with 3 admins. Two cron jobs account for 84% of all │
│  message volume: the pending complaints cron (58%) and maintenance reminders (26%). This plan reduces message volume by ~74% through     │
│ targeted optimizations, prioritized by impact and effort.                                                                                │
│                                                                                                                                          │
│ ---                                                                                                                                      │
│ Estimated Current Monthly Volume (50 units, 3 admins, ~5 pending complaints)                                                             │
│                                                                                                                                          │
│ ┌─────────────────────────────────────────────────────────────┬────────────────┐                                                         │
│ │                           Source                            │ Messages/Month │                                                         │
│ ├─────────────────────────────────────────────────────────────┼────────────────┤                                                         │
│ │ Pending complaints cron (every 6h, N complaints x M admins) │ ~1,800         │                                                         │
│ ├─────────────────────────────────────────────────────────────┼────────────────┤                                                         │
│ │ Maintenance reminders (daily to all unpaid units)           │ ~810           │                                                         │
│ ├─────────────────────────────────────────────────────────────┼────────────────┤                                                         │
│ │ Daily reports                                               │ ~90            │                                                         │
│ ├─────────────────────────────────────────────────────────────┼────────────────┤                                                         │
│ │ Admin complaint status updates                              │ ~60            │                                                         │
│ ├─────────────────────────────────────────────────────────────┼────────────────┤                                                         │
│ │ Invoices, confirmations, parcels, visitors, etc.            │ ~120           │                                                         │
│ ├─────────────────────────────────────────────────────────────┼────────────────┤                                                         │
│ │ Bot session responses                                       │ ~200           │                                                         │
│ ├─────────────────────────────────────────────────────────────┼────────────────┤                                                         │
│ │ Total                                                       │ ~3,080         │                                                         │
│ └─────────────────────────────────────────────────────────────┴────────────────┘                                                         │
│                                                                                                                                          │
│ ---                                                                                                                                      │
│ Phase 1: Quick Wins (no/minimal code changes)                                                                                            │
│                                                                                                                                          │
│ 1A. Reclassify Template Categories in Twilio Console                                                                                     │
│                                                                                                                                          │
│ - What: In Twilio Console, ensure all 22 non-broadcast templates are categorized as Utility (not Marketing). Only broadcast_announcement │
│  should be Marketing.                                                                                                                    │
│ - Why: Utility templates cost ~60% less than Marketing templates per conversation.                                                       │
│ - Effort: 0 code changes, ~30 min in Twilio Console.                                                                                     │
│ - Savings: ~$0.03/message on ~2,800 messages = ~$84/month                                                                                │
│                                                                                                                                          │
│ 1B. Reduce Pending Complaints Cron to Once Daily                                                                                         │
│                                                                                                                                          │
│ - What: Change vercel.json schedule from 0 */6 * * * to 0 8 * * * (once daily at 8 AM)                                                   │
│ - File: vercel.json (line 13)                                                                                                            │
│ - Savings: Cuts pending complaint messages from ~1,800 to ~450/month (-1,350 messages)                                                   │
│                                                                                                                                          │
│ ---                                                                                                                                      │
│ Phase 2: Consolidate Pending Complaints into Digest (highest impact)                                                                     │
│                                                                                                                                          │
│ 2A. Send One Digest Message Per Admin Instead of One Per Complaint                                                                       │
│                                                                                                                                          │
│ - What: Rewrite the nested loop in app/api/cron/pending-complaints/route.ts (lines 71-163) to aggregate all pending complaints into a    │
│ single digest message per admin recipient, instead of sending one message per complaint per admin.                                       │
│ - File: app/api/cron/pending-complaints/route.ts                                                                                         │
│ - Implementation:                                                                                                                        │
│   a. After fetching pendingComplaints, build a summary string listing all complaints (ID, resident, apartment, hours pending)            │
│   b. Loop over REMINDER_RECIPIENTS (not complaints), send one digest message per admin                                                   │
│   c. Use freeform message with the summary (or create a new pending_complaints_digest template later)                                    │
│ - Combined with 1B: Goes from 1,800 to ~90 messages/month (3 admins x 30 days)                                                           │
│ - Savings: ~1,710 messages/month                                                                                                         │
│                                                                                                                                          │
│ 2B. Filter Out Recently-Updated Complaints from Cron                                                                                     │
│                                                                                                                                          │
│ - What: Add .lt("updated_at", twentyFourHoursAgo.toISOString()) to the complaints query so complaints that already triggered an inline   │
│ admin notification are skipped                                                                                                           │
│ - File: app/api/cron/pending-complaints/route.ts (line 39)                                                                               │
│ - Savings: Prevents duplicate notifications for the same complaint                                                                       │
│                                                                                                                                          │
│ ---                                                                                                                                      │
│ Phase 3: Throttle Maintenance Reminders                                                                                                  │
│                                                                                                                                          │
│ 3A. Progressive Reminder Frequency Using reminder_last_sent_at                                                                           │
│                                                                                                                                          │
│ - What: The sendUnpaidReminders() function in lib/services/maintenance-notification.ts (lines 540-659) sends to ALL unpaid units daily.  │
│ The reminder_last_sent_at field is already written (line 642) but never read for throttling.                                             │
│ - File: lib/services/maintenance-notification.ts — sendUnpaidReminders() function                                                        │
│ - Implementation:                                                                                                                        │
│   a. After fetching unpaid payments (line 584), also select reminder_last_sent_at                                                        │
│   b. Before sending (line 623), check if enough time has passed based on progressive schedule:                                           │
│       - Days 3-7 of month: remind every 3 days                                                                                           │
│     - Days 8-15: remind every 4 days                                                                                                     │
│     - Days 16+: remind daily (overdue urgency)                                                                                           │
│   c. Skip units whose reminder_last_sent_at is too recent per the schedule                                                               │
│ - Savings: ~810 down to ~360 messages/month (-450 messages)                                                                              │
│                                                                                                                                          │
│ ---                                                                                                                                      │
│ Phase 4: Minor Optimizations                                                                                                             │
│                                                                                                                                          │
│ 4A. Skip Daily Report Only When There's Nothing Actionable                                                                               │
│                                                                                                                                          │
│ - What: In app/api/cron/daily-reports/route.ts, skip sending WhatsApp messages only when ALL of these are true:                          │
│   - Zero complaints registered in the last 24 hours (recentComplaints.length === 0)                                                      │
│   - Zero pending complaints (pendingCount === 0)                                                                                         │
│   - Zero in-progress complaints (inProgressCount === 0)                                                                                  │
│ - Rationale: Admins need to see the report whenever there's something to act on — new complaints, or any open/in-progress complaints.    │
│ Only skip when the building is truly quiet (no new complaints AND nothing pending). Bookings alone don't warrant a report.               │
│ - File: app/api/cron/daily-reports/route.ts — add early-return check after line 83 (where pendingCount and inProgressCount are           │
│ computed), before PDF generation (line 72)                                                                                               │
│ - Implementation: After the data fetches and counts (lines 50-84), add:                                                                  │
│ const hasActivity = (recentComplaints?.length || 0) > 0 || pendingCount > 0 || inProgressCount > 0                                       │
│ if (!hasActivity) {                                                                                                                      │
│   console.log("[DAILY REPORTS] No complaints activity — skipping report")                                                                │
│   await endCronJob(cronLog, { status: "skipped", ... })                                                                                  │
│   return Response(...)                                                                                                                   │
│ }                                                                                                                                        │
│ - The PDF generation, DB inserts, and WhatsApp sends only run when hasActivity is true.                                                  │
│ - Savings: ~30 messages/month on truly quiet days (weekends, holidays with zero complaints)                                              │
│                                                                                                                                          │
│ 4B. (Optional) Remove Unused Template SID                                                                                                │
│                                                                                                                                          │
│ - payment_received_admin env var is defined but never used in code. Clean up to avoid confusion.                                         │
│                                                                                                                                          │
│ ---                                                                                                                                      │
│ Phase 5: WhatsApp Session Window Tracking                                                                                                │
│                                                                                                                                          │
│ 5A. Create Session Tracking Table & Service                                                                                              │
│                                                                                                                                          │
│ WhatsApp charges differently based on conversation type:                                                                                 │
│ - User-Initiated Conversations (UIC): When a resident messages the bot, a 24h session opens. All messages within that window are covered │
│  by one cheaper charge (~$0.01).                                                                                                         │
│ - Business-Initiated Conversations (BIC): Template messages outside the 24h window each open a new conversation (~$0.02-0.05).           │
│                                                                                                                                          │
│ Currently the system always sends templates for outbound notifications, paying BIC rates even when a session is already open from a      │
│ recent bot interaction.                                                                                                                  │
│                                                                                                                                          │
│ New SQL table (add to database-complete-schema.sql):                                                                                     │
│ CREATE TABLE session_windows (                                                                                                           │
│   phone_number TEXT PRIMARY KEY,                                                                                                         │
│   last_inbound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                                                                    │
│   session_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')                                                          │
│ );                                                                                                                                       │
│ CREATE INDEX idx_session_windows_expires ON session_windows(session_expires_at);                                                         │
│ ALTER TABLE session_windows ENABLE ROW LEVEL SECURITY;                                                                                   │
│ CREATE POLICY "Service role full access" ON session_windows FOR ALL USING (true) WITH CHECK (true);                                      │
│                                                                                                                                          │
│ New file: lib/twilio/session-tracker.ts                                                                                                  │
│ - recordInboundMessage(phone: string) — upserts session_windows row with current timestamp + 24h expiry                                  │
│ - hasActiveSession(phone: string) — returns true if session_expires_at > NOW() for the phone                                             │
│ - cleanupExpiredSessions() — deletes rows where session_expires_at < NOW() (optional cron cleanup)                                       │
│                                                                                                                                          │
│ 5B. Record Inbound Messages in Webhook                                                                                                   │
│                                                                                                                                          │
│ - File: app/api/webhook/route.ts (after line 32 where phoneNumber is extracted)                                                          │
│ - Change: Call recordInboundMessage(phoneNumber) after extracting the phone number, before any other processing. This records that the   │
│ resident initiated a conversation.                                                                                                       │
│                                                                                                                                          │
│ 5C. Session-Aware Sending in sendWithFallback()                                                                                          │
│                                                                                                                                          │
│ - File: lib/twilio/send.ts — modify sendWithFallback() (lines 94-109)                                                                    │
│ - Change: Before attempting the template, check hasActiveSession(to). If an active session exists, skip the template and send the        │
│ freeform fallback directly (it's covered by the existing UIC conversation window, so it's cheaper).                                      │
│ - Logic:                                                                                                                                 │
│ export async function sendWithFallback(to, templateSid, templateVariables, fallbackMessage) {                                            │
│   // If resident has an active session, use freeform (cheaper within UIC window)                                                         │
│   const activeSession = await hasActiveSession(to)                                                                                       │
│   if (activeSession && fallbackMessage) {                                                                                                │
│     return sendMessage(to, fallbackMessage)                                                                                              │
│   }                                                                                                                                      │
│   // Otherwise use template (opens BIC) with freeform fallback                                                                           │
│   if (templateSid) {                                                                                                                     │
│     const result = await sendTemplate(to, templateSid, templateVariables)                                                                │
│     if (result.ok) return result                                                                                                         │
│   }                                                                                                                                      │
│   return sendMessage(to, fallbackMessage)                                                                                                │
│ }                                                                                                                                        │
│ - Important: This only affects sendWithFallback() calls (resident-facing notifications). Direct sendTemplate() calls (admin              │
│ notifications, cron jobs) are unaffected since admins don't interact with the bot.                                                       │
│                                                                                                                                          │
│ 5D. (Optional) Smart Broadcast Session Awareness                                                                                         │
│                                                                                                                                          │
│ - File: lib/services/broadcast.ts                                                                                                        │
│ - Change: In the send loop, check hasActiveSession(recipient.phone). If active, send as freeform instead of template. This saves the     │
│ Marketing template conversation charge for residents who recently interacted with the bot.                                               │
│                                                                                                                                          │
│ Savings estimate: If ~30% of outbound resident notifications go to residents with active sessions (~200 bot interactions/month), that's  │
│ ~60 messages that avoid opening new BIC conversations. At $0.02-0.05/conversation = ~$2-10/month.                                        │
│                                                                                                                                          │
│ ---                                                                                                                                      │
│ Summary of Expected Savings                                                                                                              │
│                                                                                                                                          │
│ ┌───────┬─────────────────────────────────────────────────┬───────────────────────────────────────────────────┐                          │
│ │ Phase │                     Change                      │               Messages Saved/Month                │                          │
│ ├───────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────┤                          │
│ │ 1B    │ Cron frequency reduction                        │ ~1,350                                            │                          │
│ ├───────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────┤                          │
│ │ 2A    │ Complaint digest consolidation                  │ ~360 more (total ~1,710 with 1B)                  │                          │
│ ├───────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────┤                          │
│ │ 3A    │ Progressive maintenance reminders               │ ~450                                              │                          │
│ ├───────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────┤                          │
│ │ 4A    │ Skip quiet daily reports                        │ ~30                                               │                          │
│ ├───────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────┤                          │
│ │ 5A-C  │ Session window tracking (cheaper conversations) │ ~60 BIC conversations avoided                     │                          │
│ ├───────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────┤                          │
│ │ 1A    │ Template reclassification (cost/msg)            │ ~$84/month                                        │                          │
│ ├───────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────┤                          │
│ │ Total │                                                 │ ~2,540 fewer messages + ~60 cheaper conversations │                          │
│ └───────┴─────────────────────────────────────────────────┴───────────────────────────────────────────────────┘                          │
│                                                                                                                                          │
│ ---                                                                                                                                      │
│ Verification                                                                                                                             │
│                                                                                                                                          │
│ 1. After Phase 1: Check Twilio Console usage dashboard — confirm cron runs drop from 4x/day to 1x/day for pending-complaints             │
│ 2. After Phase 2: Monitor cron logs — verify each run sends at most N messages (N = number of admin recipients), not N x M               │
│ 3. After Phase 3: Compare maintenance_notification_logs entries month-over-month — should see ~45% fewer entries                         │
│ 4. After Phase 4: Check daily-report cron logs on weekends — should see "skipped, no activity" entries                                   │
│ 5. After Phase 5: Send a WhatsApp message to the bot, then trigger a notification to the same number — verify it sends as freeform       │
│ (check Twilio logs for message type). Wait 24h+ and trigger again — verify it sends as template.                                         │
│ 6. Run existing test suite: npm run test to ensure no regressions              