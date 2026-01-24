# 🚀 Quick Start Guide - Dockploy + Hostinger VPS Deployment

Get your Greens Three BMS deployed in under 30 minutes!

## ⚡ Super Quick Deployment (TL;DR)

```bash
# 1. On your Hostinger VPS
curl -fsSL https://get.docker.com | sh
curl -sSL https://dockploy.com/install.sh | sh

# 2. Create app directory
mkdir -p /opt/greensthree-bms && cd /opt/greensthree-bms

# 3. Clone your repository
git clone https://github.com/yourusername/greensthree-bms.git .

# 4. Create .env file (copy from .env.example and fill in values)
cp .env.example .env
nano .env

# 5. Deploy
docker-compose up -d --build

# 6. Setup cron jobs
./setup-cron.sh

# 7. Configure domain and SSL
certbot certonly --standalone -d yourdomain.com
mkdir -p ssl && cp /etc/letsencrypt/live/yourdomain.com/*.pem ssl/
docker-compose restart

# Done! Access at https://yourdomain.com
```

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Hostinger VPS** (KVM 2 recommended: $8.99/mo, 4GB RAM)
- [ ] **Domain name** pointed to VPS IP (A record)
- [ ] **Supabase account** (existing database)
- [ ] **Twilio account** (WhatsApp messaging)
- [ ] **GitHub repository** (code pushed)
- [ ] **SSH access** to VPS (root or sudo user)

---

## 🎯 Step-by-Step (30 Minutes)

### 1️⃣ VPS Setup (5 minutes)

```bash
# SSH into VPS
ssh root@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Dockploy
curl -sSL https://dockploy.com/install.sh | sh

# Configure firewall
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
```

### 2️⃣ Application Setup (10 minutes)

```bash
# Create directory
mkdir -p /opt/greensthree-bms
cd /opt/greensthree-bms

# Clone repository
git clone https://github.com/yourusername/greensthree-bms.git .

# Create environment file
cp .env.example .env

# Edit .env and add your credentials
nano .env
```

**Required environment variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3️⃣ Deploy Application (5 minutes)

```bash
# Build and start containers
docker-compose up -d --build

# Wait for containers to start (30 seconds)
sleep 30

# Verify deployment
docker ps
curl http://localhost:3000/api/ping
```

### 4️⃣ SSL Certificate (5 minutes)

```bash
# Stop containers temporarily
docker-compose down

# Get SSL certificate
apt install certbot -y
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
mkdir -p ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/

# Update nginx.conf with your domain
sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN/g' nginx.conf

# Start containers
docker-compose up -d
```

### 5️⃣ Setup Cron Jobs (2 minutes)

```bash
# Run cron setup script
chmod +x setup-cron.sh
./setup-cron.sh

# Verify cron jobs
crontab -l
```

### 6️⃣ Configure GitHub Actions (3 minutes)

**Add these secrets to GitHub:**

Go to: `Repository → Settings → Secrets and variables → Actions`

```
VPS_HOST = your-vps-ip
VPS_USERNAME = root
VPS_SSH_KEY = <paste SSH private key>
VPS_PORT = 22

NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxx...
NEXT_PUBLIC_APP_URL = https://yourdomain.com

PRODUCTION_DOMAIN = yourdomain.com
```

**Generate SSH key for GitHub Actions:**
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github-actions  # Copy this to VPS_SSH_KEY secret
```

---

## ✅ Verification

Test your deployment:

```bash
# 1. Check containers are running
docker ps

# 2. Test health endpoint
curl http://localhost:3000/api/ping

# 3. Test from outside
curl https://yourdomain.com/api/ping

# 4. Check cron jobs
crontab -l

# 5. View logs
docker-compose logs -f app
```

---

## 🎉 You're Live!

Your application is now:
- ✅ Running on https://yourdomain.com
- ✅ Auto-deploying from GitHub
- ✅ Secured with SSL
- ✅ Running scheduled cron jobs
- ✅ Saving 50-85% on hosting costs

---

## 🔄 Daily Operations

### Deploy New Changes
```bash
# Option 1: Let GitHub Actions handle it (recommended)
git push origin main  # Automatically deploys

# Option 2: Manual deployment
cd /opt/greensthree-bms
git pull
docker-compose up -d --build
```

### View Logs
```bash
docker-compose logs -f app  # App logs
docker-compose logs -f nginx  # Nginx logs
journalctl -u cron -f  # Cron job logs
```

### Restart Application
```bash
docker-compose restart app  # Restart app only
docker-compose restart  # Restart all containers
```

### Update SSL Certificate (every 90 days)
```bash
certbot renew
cp /etc/letsencrypt/live/yourdomain.com/*.pem /opt/greensthree-bms/ssl/
docker-compose restart nginx
```

---

## 🆘 Quick Troubleshooting

**Container won't start?**
```bash
docker-compose logs app
docker-compose down -v && docker-compose up -d --build
```

**Can't access website?**
```bash
# Check firewall
ufw status

# Check Nginx
docker-compose logs nginx

# Check DNS
ping yourdomain.com
```

**Cron jobs not running?**
```bash
# Test manually
curl -X POST http://localhost:3000/api/cron/booking-reminder

# Check cron service
systemctl status cron
```

---

## 📖 Need More Details?

For comprehensive documentation, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For specific issues:
- Dockploy: https://dockploy.com/docs
- Next.js: https://nextjs.org/docs/deployment
- Docker: https://docs.docker.com

---

## 💰 Monthly Cost Breakdown

| Item | Cost |
|------|------|
| Hostinger VPS KVM 2 | $8.99 |
| Supabase (Free Tier) | $0.00 |
| Domain (existing) | - |
| SSL (Let's Encrypt) | $0.00 |
| **Total** | **$8.99/month** |

**vs Vercel Setup:** $45-80/month → **Save 80%+**

---

**Questions?** Create an issue in the GitHub repository or check the troubleshooting section in DEPLOYMENT.md.

Happy deploying! 🎉
