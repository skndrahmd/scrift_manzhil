# Realtime Troubleshooting - Advanced Debugging

## 🔍 Step-by-Step Debugging Guide

### **Step 1: Check Browser Console**

Open admin panel and check for these specific messages:

#### ✅ **Good Signs:**
```
Bookings channel status: SUBSCRIBED
✅ Realtime connected for bookings
Complaints channel status: SUBSCRIBED
✅ Realtime connected for complaints
```

#### ❌ **Bad Signs:**
```
Bookings channel status: CHANNEL_ERROR
Bookings channel status: TIMED_OUT
Bookings channel status: CLOSED
```

### **Step 2: Verify Realtime is Enabled in Supabase**

1. Go to Supabase Dashboard
2. Click **Settings** (gear icon) → **API**
3. Scroll down to **"Realtime"** section
4. Make sure **"Enable Realtime"** is toggled ON
5. Check if your plan includes Realtime (Free tier has limited realtime)

### **Step 3: Check Database Publications**

Run this SQL to verify tables are in the publication:

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

**Expected output:** All 7 tables should be listed:
- booking_settings
- bookings
- complaints
- feedback
- maintenance_payments
- profiles
- staff

### **Step 4: Verify RLS Policies Allow Realtime**

Realtime uses the **anon** role. Check if anon has SELECT permissions:

```sql
-- Check policies for bookings
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM 
  pg_policies
WHERE 
  tablename IN ('bookings', 'complaints', 'profiles')
ORDER BY 
  tablename, policyname;
```

You should see policies for **anon** role with **SELECT** permissions.

### **Step 5: Test Realtime Connection Manually**

Add this test code to your admin panel temporarily:

```typescript
// Add this in useEffect after the existing subscriptions
const testChannel = supabase
  .channel('test-channel')
  .on('broadcast', { event: 'test' }, (payload) => {
    console.log('🎉 Broadcast received:', payload)
  })
  .subscribe((status) => {
    console.log('Test channel status:', status)
    if (status === 'SUBSCRIBED') {
      console.log('✅ Realtime is working!')
      // Send a test broadcast
      testChannel.send({
        type: 'broadcast',
        event: 'test',
        payload: { message: 'Hello from realtime!' }
      })
    }
  })
```

### **Step 6: Check Supabase Project Region**

Some Supabase regions have realtime issues. Check:
1. Go to Supabase Dashboard → **Settings** → **General**
2. Note your **Region**
3. If it's an older region, realtime might be limited

### **Step 7: Verify Environment Variables**

Make sure your `.env.local` has the correct values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://sbhvbhlrehenufvxwihp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**Important:** The URL must be the **project URL**, not the API URL.

### **Step 8: Check Network Tab**

1. Open DevTools → **Network** tab
2. Filter by **WS** (WebSocket)
3. Look for a connection to `realtime-v2.supabase.co` or similar
4. Check if it's connected or failed

#### ✅ **Good:** 
- Status: 101 Switching Protocols
- Connection stays open

#### ❌ **Bad:**
- Status: 403, 404, or 500
- Connection closes immediately

---

## 🔧 Common Issues & Fixes

### **Issue 1: "CHANNEL_ERROR" in Console**

**Possible Causes:**
1. Table not in publication
2. RLS blocking SELECT
3. Invalid channel name

**Fix:**
```sql
-- Re-add table to publication
ALTER PUBLICATION supabase_realtime DROP TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Verify
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

### **Issue 2: "TIMED_OUT" in Console**

**Possible Causes:**
1. Network/firewall blocking WebSocket
2. Supabase project paused
3. Rate limiting

**Fix:**
- Check if project is paused in Supabase dashboard
- Try from different network
- Check browser console for CORS errors

### **Issue 3: Connection Established but No Events**

**Possible Causes:**
1. RLS policies blocking realtime events
2. Wrong event type filter
3. Schema mismatch

**Fix:**
```sql
-- Temporarily disable RLS to test
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Test if events come through
-- Then re-enable and fix policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
```

### **Issue 4: Works Locally but Not in Production**

**Possible Causes:**
1. Environment variables not set in Vercel
2. Different Supabase project
3. CORS issues

**Fix:**
- Verify all env vars in Vercel dashboard
- Check Supabase project URL matches
- Add your Vercel domain to Supabase allowed origins

---

## 🧪 Quick Test Script

Run this in browser console while on admin panel:

```javascript
// Test if Supabase client is configured correctly
console.log('Supabase URL:', supabase.supabaseUrl)
console.log('Supabase Key:', supabase.supabaseKey.substring(0, 20) + '...')

// Test realtime connection
const testSub = supabase
  .channel('debug-test')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'bookings' },
    (payload) => console.log('📨 Change received:', payload)
  )
  .subscribe((status) => {
    console.log('🔌 Connection status:', status)
  })

// Wait 5 seconds then check
setTimeout(() => {
  console.log('Channel state:', testSub.state)
}, 5000)
```

---

## 🚨 Nuclear Option: Complete Reset

If nothing works, try this:

```sql
-- 1. Remove all tables from publication
ALTER PUBLICATION supabase_realtime DROP TABLE profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE bookings;
ALTER PUBLICATION supabase_realtime DROP TABLE complaints;
ALTER PUBLICATION supabase_realtime DROP TABLE maintenance_payments;
ALTER PUBLICATION supabase_realtime DROP TABLE feedback;
ALTER PUBLICATION supabase_realtime DROP TABLE staff;
ALTER PUBLICATION supabase_realtime DROP TABLE booking_settings;

-- 2. Wait 10 seconds

-- 3. Add them back
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE booking_settings;

-- 4. Restart your Next.js dev server
-- 5. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
```

---

## 📊 What to Report if Still Not Working

If realtime still doesn't work, provide:

1. **Console logs** - Copy all messages from browser console
2. **Channel status** - What status do you see? (SUBSCRIBED, CHANNEL_ERROR, etc.)
3. **Network tab** - Screenshot of WebSocket connection
4. **SQL output** - Result of publication query
5. **Supabase plan** - Free, Pro, or Enterprise?
6. **Region** - Which Supabase region is your project in?

---

## ✅ Expected Working State

When everything is working correctly:

### **Console Output:**
```
Bookings channel status: SUBSCRIBED
✅ Realtime connected for bookings
Complaints channel status: SUBSCRIBED
✅ Realtime connected for complaints
```

### **Network Tab:**
- WebSocket connection to `realtime-v2.supabase.co`
- Status: 101 Switching Protocols
- Connection stays open (green indicator)

### **Behavior:**
- Create a complaint via WhatsApp
- Toast notification appears in admin panel within 1-2 seconds
- No page refresh needed
- Complaint appears in list automatically

---

## 🔍 Alternative: Check Supabase Logs

1. Go to Supabase Dashboard
2. Click **Logs** → **Realtime Logs**
3. Look for connection attempts and errors
4. Check if subscriptions are being registered

This can reveal server-side issues that don't show in browser console.
