# Building Management System (BMS)
## Comprehensive Deployment Guide

---

**Version:** 1.0  
**Last Updated:** November 7, 2025  
**Prepared for:** New Client Deployments

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Architecture](#system-architecture)
3. [Step 1: Clone and Setup Repository](#step-1-clone-and-setup-repository)
4. [Step 2: Supabase Database Setup](#step-2-supabase-database-setup)
5. [Step 3: Twilio WhatsApp Configuration](#step-3-twilio-whatsapp-configuration)
6. [Step 4: Environment Variables](#step-4-environment-variables)
7. [Step 5: Local Development](#step-5-local-development)
8. [Step 6: Vercel Deployment](#step-6-vercel-deployment)
9. [Step 7: Post-Deployment Configuration](#step-7-post-deployment-configuration)
10. [Step 8: Testing](#step-8-testing)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

Before starting the deployment, ensure you have:

### Required Accounts
- ✅ **GitHub Account** - For code repository
- ✅ **Vercel Account** - For hosting (free tier available)
- ✅ **Supabase Account** - For database (free tier available)
- ✅ **Twilio Account** - For WhatsApp messaging (paid service)

### Required Software
- ✅ **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- ✅ **Git** - [Download](https://git-scm.com/)
- ✅ **Code Editor** - VS Code recommended

### Required Knowledge
- Basic understanding of command line
- Basic Git knowledge
- Understanding of environment variables

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Deployment                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Vercel     │◄────►│   Supabase   │                │
│  │  (Hosting)   │      │  (Database)  │                │
│  └──────┬───────┘      └──────────────┘                │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐      ┌──────────────┐                │
│  │    Twilio    │◄────►│   Residents  │                │
│  │  (WhatsApp)  │      │  (End Users) │                │
│  └──────────────┘      └──────────────┘                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Clone and Setup Repository

### 1.1 Create New Repository

```bash
# Option A: Fork the original repository
# Go to GitHub and fork the repository

# Option B: Create a fresh copy
git clone https://github.com/your-username/BMS.git client-name-bms
cd client-name-bms

# Remove original git history (optional)
rm -rf .git
git init
git add .
git commit -m "Initial commit for [Client Name]"

# Create new GitHub repository and push
git remote add origin https://github.com/your-username/client-name-bms.git
git branch -M main
git push -u origin main
```

### 1.2 Install Dependencies

```bash
# Install all required packages
npm install

# Verify installation
npm list
```

### 1.3 Update Branding

Update the following files with client-specific branding:

**File: `app/layout.tsx`**
```typescript
export const metadata: Metadata = {
  title: "[Client Name] BMS",
  description: "Building Management System for [Client Name]",
}
```

**File: `app/admin/page.tsx`**
- Update logo reference
- Update building name
- Update color scheme if needed

**File: `app/api/residents/welcome-message/route.ts`**
- Update welcome message text
- Update building name

---

## Step 2: Supabase Database Setup

### 2.1 Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in details:
   - **Name:** `[client-name]-bms`
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to client location
   - **Pricing Plan:** Start with Free tier
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

### 2.2 Get API Credentials

1. Go to **Project Settings** → **API**
2. Copy and save:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`)

### 2.3 Create Database Tables

Go to **SQL Editor** and run the following scripts:

#### Create Profiles Table
```sql
-- Profiles (Residents) Table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,
  cnic TEXT,
  apartment_number TEXT NOT NULL,
  building_block TEXT,
  is_active BOOLEAN DEFAULT true,
  maintenance_charges NUMERIC DEFAULT 5000,
  maintenance_paid BOOLEAN DEFAULT false,
  last_payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_apartment ON profiles(apartment_number);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy (adjust based on your auth setup)
CREATE POLICY "Enable all access for authenticated users" ON profiles
  FOR ALL USING (true);
```

#### Create Bookings Table
```sql
-- Bookings Table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'payment_pending')),
  booking_charges NUMERIC DEFAULT 5000,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_due_date DATE,
  paid_date DATE,
  payment_reference TEXT,
  confirmation_sent BOOLEAN DEFAULT false,
  confirmation_sent_at TIMESTAMPTZ,
  payment_confirmation_sent BOOLEAN DEFAULT false,
  reminder_last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_bookings_profile ON bookings(profile_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_paid_date ON bookings(paid_date);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON bookings
  FOR ALL USING (true);
```

#### Create Complaints Table
```sql
-- Complaints Table
CREATE TABLE complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('apartment', 'building')),
  subcategory TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
  group_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_complaints_profile ON complaints(profile_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_group_key ON complaints(group_key);
CREATE INDEX idx_complaints_complaint_id ON complaints(complaint_id);

-- Enable RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON complaints
  FOR ALL USING (true);
```

#### Create Maintenance Payments Table
```sql
-- Maintenance Payments Table
CREATE TABLE maintenance_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  paid_date DATE,
  payment_reference TEXT,
  confirmation_sent BOOLEAN DEFAULT false,
  confirmation_sent_at TIMESTAMPTZ,
  reminder_last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, year, month)
);

-- Create indexes
CREATE INDEX idx_maintenance_profile ON maintenance_payments(profile_id);
CREATE INDEX idx_maintenance_year_month ON maintenance_payments(year, month);
CREATE INDEX idx_maintenance_status ON maintenance_payments(status);

-- Enable RLS
ALTER TABLE maintenance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON maintenance_payments
  FOR ALL USING (true);
```

#### Create Booking Settings Table
```sql
-- Booking Settings Table
CREATE TABLE booking_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '23:00:00',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  booking_charges NUMERIC DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO booking_settings (start_time, end_time, slot_duration_minutes, booking_charges)
VALUES ('09:00:00', '23:00:00', 60, 5000);

-- Enable RLS
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON booking_settings
  FOR ALL USING (true);
```

### 2.4 Setup Storage (Optional - for images)

1. Go to **Storage** in Supabase dashboard
2. Click **"Create a new bucket"**
3. Name it: `bms-images` or `[client-name]-images`
4. Set to **Public** if you want images accessible
5. Click **"Create bucket"**

---

## Step 3: Twilio WhatsApp Configuration

### 3.1 Create Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for an account
3. Verify your email and phone number

### 3.2 Get WhatsApp Sandbox (Development)

For testing:
1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow instructions to join sandbox
3. Note the sandbox number (e.g., `+14155238886`)

### 3.3 Setup Production WhatsApp (For Live Deployment)

For production:
1. Go to **Messaging** → **WhatsApp** → **Senders**
2. Click **"Request to enable your Twilio number for WhatsApp"**
3. Follow Facebook Business verification process
4. This can take 1-3 weeks for approval

### 3.4 Get Twilio Credentials

1. Go to **Account** → **API keys & tokens**
2. Copy and save:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click to reveal)
3. Note your WhatsApp number

### 3.5 Configure Webhook URL

1. Go to **Messaging** → **Settings** → **WhatsApp sandbox settings**
2. Set **"When a message comes in"** to:
   ```
   https://your-app-url.vercel.app/api/webhook
   ```
3. Method: **POST**
4. Click **"Save"**

---

## Step 4: Environment Variables

### 4.1 Create `.env.local` File

Create a file named `.env.local` in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Job Security (generate a random string)
CRON_SECRET=your-random-secret-key-here
NEXT_PUBLIC_CRON_SECRET=your-random-secret-key-here
```

### 4.2 Generate Secure Keys

For `CRON_SECRET`, generate a random string:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use an online generator
# https://randomkeygen.com/
```

### 4.3 Important Notes

- ⚠️ **Never commit `.env.local` to Git**
- ⚠️ `.env.local` is already in `.gitignore`
- ⚠️ Keep these credentials secure

---

## Step 5: Local Development

### 5.1 Start Development Server

```bash
# Start the development server
npm run dev

# Server will start at http://localhost:3000
```

### 5.2 Test the Application

1. **Admin Dashboard:** `http://localhost:3000/admin`
2. **Login Page:** `http://localhost:3000/login`
3. **Test WhatsApp:** Send a message to your Twilio sandbox number

### 5.3 Create Admin User

You need to create an admin user in Supabase:

1. Go to **Authentication** → **Users**
2. Click **"Add user"**
3. Fill in:
   - **Email:** admin@clientname.com
   - **Password:** Create a strong password
4. Click **"Create user"**
5. Save credentials securely

---

## Step 6: Vercel Deployment

### 6.1 Prepare for Deployment

```bash
# Ensure all changes are committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 6.2 Deploy to Vercel

#### Option A: Vercel Dashboard

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: client-name-bms
# - Directory: ./
# - Override settings? No

# For production deployment
vercel --prod
```

### 6.3 Configure Environment Variables in Vercel

1. Go to your project in Vercel
2. Click **Settings** → **Environment Variables**
3. Add all variables from `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGci...
TWILIO_ACCOUNT_SID = ACxxxxx...
TWILIO_AUTH_TOKEN = your_token
TWILIO_WHATSAPP_NUMBER = whatsapp:+14155238886
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
CRON_SECRET = your-secret-key
NEXT_PUBLIC_CRON_SECRET = your-secret-key
```

4. Click **"Save"** for each variable
5. Redeploy the application

### 6.4 Get Production URL

After deployment, you'll get a URL like:
```
https://client-name-bms.vercel.app
```

### 6.5 Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain (e.g., `bms.clientname.com`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

---

## Step 7: Post-Deployment Configuration

### 7.1 Update Twilio Webhook

1. Go to Twilio Console
2. Navigate to **Messaging** → **Settings** → **WhatsApp sandbox**
3. Update webhook URL to production:
   ```
   https://your-app.vercel.app/api/webhook
   ```
4. Click **"Save"**

### 7.2 Update Supabase Allowed URLs

1. Go to Supabase project
2. Navigate to **Authentication** → **URL Configuration**
3. Add your production URL:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:** `https://your-app.vercel.app/**`

### 7.3 Setup Cron Jobs (Optional)

For automated reminders, set up cron jobs:

1. Go to [https://cron-job.org](https://cron-job.org) or use Vercel Cron
2. Create jobs for:
   - **Booking Reminders:** Daily at 10:00 AM
     ```
     https://your-app.vercel.app/api/cron/booking-reminder
     ```
   - **Maintenance Reminders:** Daily at 9:00 AM
     ```
     https://your-app.vercel.app/api/cron/maintenance-reminder
     ```
3. Add header: `x-cron-key: your-cron-secret`

---

## Step 8: Testing

### 8.1 Test Checklist

- [ ] Admin login works
- [ ] Can add new residents
- [ ] Welcome message sent to new residents
- [ ] WhatsApp booking flow works
- [ ] Booking appears in admin dashboard
- [ ] Payment status can be updated
- [ ] Complaint submission works
- [ ] Complaint status updates work
- [ ] Maintenance payment tracking works
- [ ] PDF exports work
- [ ] All notifications send correctly

### 8.2 Test WhatsApp Integration

1. Add a test resident with your phone number
2. Send "Hi" to the WhatsApp number
3. Verify you receive the menu
4. Test booking flow:
   - Select "Book Hall"
   - Choose date and time
   - Confirm booking
5. Test complaint flow:
   - Select "Complaint"
   - Choose category
   - Submit complaint

### 8.3 Test Admin Functions

1. Login to admin dashboard
2. Add a new resident
3. Update booking payment status
4. Update complaint status
5. Mark maintenance as paid
6. Export reports to PDF

---

## Step 9: Data Migration

### 9.1 Prepare Client Data

Create a CSV file with resident data:

```csv
name,phone_number,cnic,apartment_number,maintenance_charges
John Doe,+923001234567,12345-1234567-1,A-101,5000
Jane Smith,+923007654321,12345-7654321-1,A-102,5000
```

### 9.2 Import Data

#### Option A: Using Supabase Dashboard

1. Go to **Table Editor** → **profiles**
2. Click **"Insert"** → **"Import data from CSV"**
3. Upload your CSV file
4. Map columns correctly
5. Click **"Import"**

#### Option B: Using SQL

```sql
INSERT INTO profiles (name, phone_number, cnic, apartment_number, maintenance_charges)
VALUES
  ('John Doe', '+923001234567', '12345-1234567-1', 'A-101', 5000),
  ('Jane Smith', '+923007654321', '12345-7654321-1', 'A-102', 5000);
```

### 9.3 Send Welcome Messages

After importing, you can manually trigger welcome messages:
1. Go to admin dashboard
2. For each resident, you can use the "Add User" feature which auto-sends welcome messages
3. Or create a script to bulk send welcome messages

---

## Troubleshooting

### Common Issues

#### Issue: WhatsApp messages not sending

**Solution:**
1. Check Twilio credentials in environment variables
2. Verify Twilio account has credits
3. Check Twilio logs in dashboard
4. Ensure phone numbers are in E.164 format (+923001234567)

#### Issue: Database connection fails

**Solution:**
1. Verify Supabase URL and keys
2. Check if project is paused (free tier)
3. Verify RLS policies are set correctly
4. Check network connectivity

#### Issue: Admin login not working

**Solution:**
1. Verify admin user exists in Supabase Auth
2. Check email/password are correct
3. Clear browser cache
4. Check browser console for errors

#### Issue: Deployment fails

**Solution:**
1. Check build logs in Vercel
2. Verify all environment variables are set
3. Ensure `package.json` has correct scripts
4. Check for TypeScript errors: `npm run build`

#### Issue: Webhook not receiving messages

**Solution:**
1. Verify webhook URL in Twilio is correct
2. Check URL is publicly accessible
3. Verify webhook endpoint returns 200 status
4. Check Vercel function logs

---

## Maintenance & Updates

### Regular Maintenance Tasks

#### Daily
- Monitor Twilio message logs
- Check for failed notifications
- Review complaint submissions

#### Weekly
- Review system performance in Vercel
- Check database usage in Supabase
- Backup important data

#### Monthly
- Review and optimize database queries
- Update dependencies: `npm update`
- Review security updates
- Generate usage reports

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Test locally
npm run dev

# Deploy to production
git push origin main
# Vercel will auto-deploy
```

### Database Backups

1. Go to Supabase Dashboard
2. Navigate to **Database** → **Backups**
3. Click **"Create backup"**
4. Download backup file
5. Store securely

### Monitoring

#### Vercel Analytics
- Go to **Analytics** tab in Vercel
- Monitor page views, performance
- Check for errors

#### Supabase Logs
- Go to **Logs** in Supabase
- Monitor database queries
- Check for slow queries

#### Twilio Logs
- Go to **Monitor** → **Logs** in Twilio
- Check message delivery status
- Monitor costs

---

## Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env.local` to Git
- ✅ Use different keys for dev/prod
- ✅ Rotate keys regularly (every 3-6 months)

### 2. Database Security
- ✅ Enable Row Level Security (RLS)
- ✅ Use service role key only in backend
- ✅ Regular backups
- ✅ Monitor for suspicious activity

### 3. Authentication
- ✅ Use strong passwords
- ✅ Enable 2FA for admin accounts
- ✅ Limit admin user count
- ✅ Regular password updates

### 4. API Security
- ✅ Use CRON_SECRET for cron endpoints
- ✅ Validate all inputs
- ✅ Rate limiting (built into Vercel)
- ✅ HTTPS only (automatic with Vercel)

---

## Cost Estimation

### Monthly Costs (Approximate)

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| **Vercel** | Free | $20/month | Free tier sufficient for most cases |
| **Supabase** | Free | $25/month | 500MB database, 2GB bandwidth |
| **Twilio** | N/A | $0.005/msg | ~PKR 1.5 per message |

### Example Cost Breakdown

For a building with 50 residents:
- **Messages per month:** ~500 (10 per resident)
- **Twilio cost:** $2.50/month (~PKR 700)
- **Hosting:** Free (Vercel + Supabase free tiers)
- **Total:** ~PKR 700-1000/month

---

## Support & Resources

### Documentation
- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **Twilio:** https://www.twilio.com/docs/whatsapp
- **Vercel:** https://vercel.com/docs

### Getting Help
- Check application logs in Vercel
- Review Supabase logs
- Check Twilio message logs
- Contact development team

---

## Checklist for New Deployment

Use this checklist for each new client deployment:

### Pre-Deployment
- [ ] GitHub repository created
- [ ] Code cloned and dependencies installed
- [ ] Branding updated (logo, name, colors)
- [ ] Supabase project created
- [ ] Database tables created
- [ ] Twilio account setup
- [ ] WhatsApp number configured
- [ ] Environment variables configured locally
- [ ] Local testing completed

### Deployment
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] Application deployed successfully
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

### Post-Deployment
- [ ] Twilio webhook updated to production URL
- [ ] Supabase URLs updated
- [ ] Admin user created
- [ ] Client data imported
- [ ] Welcome messages sent
- [ ] All features tested in production
- [ ] Cron jobs configured
- [ ] Monitoring setup
- [ ] Documentation provided to client
- [ ] Training session completed

---

## Conclusion

This guide provides a complete walkthrough for deploying a new instance of the Building Management System. Follow each step carefully and refer to the troubleshooting section if you encounter any issues.

For additional support or custom requirements, contact the development team.

---

**Document Version:** 1.0  
**Last Updated:** November 7, 2025  
**Maintained by:** Greens Three Development Team
