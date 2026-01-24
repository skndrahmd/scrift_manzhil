# Fixing Supabase Realtime Notifications

## 🔴 Current Issue
The realtime notification system is implemented in the code but not working.

## ✅ Solution: Enable Realtime in Supabase

### **Step 1: Enable Realtime in Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Click **"Database"** in the left sidebar
3. Click **"Replication"** tab
4. Under **"Database Publications"**, you should see a publication called `supabase_realtime`

### **Step 2: Enable Realtime for All Tables**

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE booking_settings;
```

### **Step 3: Verify Realtime is Enabled**

Run this SQL to check which tables have realtime enabled:

```sql
SELECT 
  schemaname,
  tablename
FROM 
  pg_publication_tables
WHERE 
  pubname = 'supabase_realtime'
ORDER BY 
  tablename;
```

You should see all 7 tables listed.

---

## 🎯 What the Realtime System Does

The admin panel has realtime subscriptions for:

### **1. Bookings Channel**
- **Listens to:** All changes in `bookings` table
- **Shows toast when:**
  - New booking created → "New Booking Received"
  - Booking updated → "Booking Updated"
- **Auto-refreshes:** Booking list

### **2. Complaints Channel**
- **Listens to:** All changes in `complaints` table
- **Shows toast when:**
  - New complaint created → "New Complaint Received"
  - Complaint updated → "Complaint Updated"
- **Auto-refreshes:** Complaint list
- **Updates:** Realtime connection status indicator

### **3. Profiles Channel**
- **Listens to:** All changes in `profiles` table
- **Shows toast when:** Resident added or modified
- **Auto-refreshes:** Resident list

---

## 🔍 How to Test if Realtime is Working

### **Method 1: Check Browser Console**

1. Open admin panel: `http://localhost:3000/admin`
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Look for these messages:
   ```
   ✅ Realtime connected for bookings
   ✅ Realtime connected for complaints
   ```

### **Method 2: Test with WhatsApp**

1. Keep admin panel open in browser
2. Send a WhatsApp message to register a complaint
3. You should see:
   - Console log: "Complaint change detected"
   - Toast notification: "New Complaint Received"
   - Complaint appears in list automatically (no refresh needed)

### **Method 3: Test with Manual Insert**

Run this in Supabase SQL Editor while admin panel is open:

```sql
-- Insert a test complaint
INSERT INTO complaints (
  profile_id,
  category,
  subcategory,
  description,
  status
) VALUES (
  (SELECT id FROM profiles LIMIT 1),
  'Test',
  'Test Issue',
  'This is a test complaint',
  'pending'
);
```

You should see the toast notification appear immediately!

---

## 🐛 Troubleshooting

### **Issue: No console logs at all**

**Cause:** Realtime not enabled in Supabase
**Fix:** Run Step 2 SQL commands above

### **Issue: "CHANNEL_ERROR" or "TIMED_OUT" in console**

**Cause:** RLS policies might be blocking realtime
**Fix:** Realtime uses the anon key, so the policies we created should work. Check if RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All should show `rowsecurity = true`

### **Issue: Console shows "SUBSCRIBED" but no updates**

**Cause:** Table not added to publication
**Fix:** Run this to check:

```sql
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

If missing, add with:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE <table_name>;
```

---

## 📊 Realtime Connection Indicator

The admin panel has a connection status indicator:
- **Green dot** = Realtime connected
- **Red dot** = Realtime disconnected

This is controlled by the `realtimeConnected` state variable.

---

## 🔧 Alternative: If Realtime Still Doesn't Work

If Supabase Realtime is not available in your plan or region, you can use polling instead:

```typescript
// In app/admin/page.tsx, replace the realtime subscriptions with:
useEffect(() => {
  fetchData()
  
  // Poll for updates every 10 seconds
  const interval = setInterval(() => {
    fetchBookings()
    fetchComplaints()
    fetchProfiles()
  }, 10000)
  
  return () => clearInterval(interval)
}, [])
```

But this is less efficient than realtime subscriptions.

---

## ✅ Expected Behavior After Fix

1. **Open admin panel** → Console shows "✅ Realtime connected"
2. **New booking via WhatsApp** → Toast notification appears
3. **New complaint via WhatsApp** → Toast notification appears
4. **Update from another tab** → Changes appear automatically
5. **No manual refresh needed** → Everything updates in real-time

---

## 🚀 Quick Fix Summary

**Just run this SQL and you're done:**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE booking_settings;
```

Then reload the admin panel and check the console! 🎯
