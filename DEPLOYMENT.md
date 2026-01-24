# 🚀 Greens Three BMS - Hostinger VPS Deployment Guide

Complete guide for deploying the Building Management System on Hostinger VPS using Dockploy with GitHub Actions CI/CD.

## 📊 Cost Comparison

| Service | Current (Vercel) | New (Hostinger VPS) | Savings |
|---------|------------------|---------------------|---------|
| Hosting | $20-40/month | $4-12/month | 70-85% |
| Database | Supabase (existing) | Supabase (keep) | - |
| Storage | Vercel Blob ($0.15/GB) | VPS Storage (free) | 100% |
| **Total** | **$45-80/month** | **$4-37/month** | **50-85%** |

---

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Hostinger VPS ($8.99/mo)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Dockploy (Port 3000) - Container Management         │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Nginx (Ports 80/443) - Reverse Proxy + SSL   │  │   │
│  │  │    ↓                                           │  │   │
│  │  │  Next.js App Container (Port 3000)            │  │   │
│  │  │    - Frontend (SSR)                           │  │   │
│  │  │    - API Routes                               │  │   │
│  │  │    - Cron Jobs (system cron)                  │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
                          ↓ (Database Queries)
                          ↓
                  ┌───────────────┐
                  │   Supabase    │
                  │  (PostgreSQL) │
                  └───────────────┘
```

---

## 🛠️ Prerequisites

### 1. Hostinger VPS
- [ ] VPS purchased (recommended: KVM 2 - 4GB RAM, 2 CPU cores)
- [ ] Root SSH access configured
- [ ] Static IP address assigned
- [ ] Domain name pointed to VPS IP (A record)

### 2. GitHub Repository
- [ ] Code pushed to GitHub
- [ ] GitHub Actions enabled
- [ ] Repository secrets configured (see below)

### 3. Supabase Database
- [ ] Existing Supabase project (keep as-is)
- [ ] Database credentials ready

### 4. Twilio Account
- [ ] Account SID and Auth Token
- [ ] WhatsApp number configured

---

## 📦 Step 1: Initial VPS Setup

### 1.1 Connect to VPS
```bash
ssh root@your-vps-ip
```

### 1.2 Update System
```bash
apt update && apt upgrade -y
```

### 1.3 Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Enable Docker on boot
systemctl enable docker
systemctl start docker

# Verify installation
docker --version
docker-compose --version
```

### 1.4 Install Dockploy
```bash
# One-command installation
curl -sSL https://dockploy.com/install.sh | sh

# Access Dockploy at: http://your-vps-ip:3000
# Set admin password on first login
```

### 1.5 Configure Firewall
```bash
# Allow SSH, HTTP, HTTPS, and Dockploy
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw enable
ufw status
```

---

## 🔐 Step 2: Configure GitHub Secrets

Go to GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

### VPS Connection Secrets
```bash
VPS_HOST=your-vps-ip-or-domain
VPS_USERNAME=root
VPS_SSH_KEY=<paste your private SSH key>
VPS_PORT=22
```

### Environment Variables for Build
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Docker Hub (Optional - for image registry)
```bash
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password
```

### Production Domain
```bash
PRODUCTION_DOMAIN=yourdomain.com
```

---

## 🌐 Step 3: Configure Domain & SSL

### 3.1 Point Domain to VPS
In your domain registrar (e.g., Namecheap, GoDaddy):
```
Type: A Record
Host: @
Value: your-vps-ip
TTL: 300
```

```
Type: A Record
Host: www
Value: your-vps-ip
TTL: 300
```

### 3.2 Install Certbot for SSL (Let's Encrypt)
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Stop Nginx temporarily
docker-compose down

# Obtain SSL certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be saved at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 3.3 Create SSL Directory for Docker
```bash
mkdir -p /opt/greensthree-bms/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/greensthree-bms/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/greensthree-bms/ssl/
```

### 3.4 Auto-Renewal Setup
```bash
# Add cron job for certificate renewal
echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /opt/greensthree-bms/ssl/ && docker-compose restart nginx" | crontab -
```

---

## 🐳 Step 4: Deploy Application

### 4.1 Create Application Directory
```bash
mkdir -p /opt/greensthree-bms
cd /opt/greensthree-bms
```

### 4.2 Create Environment File
```bash
nano .env
```

Paste the following (replace with your actual values):
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Twilio Templates
TWILIO_TEMPLATE_WELCOME_MESSAGE=HX...
TWILIO_TEMPLATE_BOOKING_CONFIRMATION=HX...
TWILIO_TEMPLATE_BOOKING_REMINDER=HX...
TWILIO_TEMPLATE_BOOKING_CANCELLATION=HX...
TWILIO_TEMPLATE_BOOKING_MODIFICATION=HX...
TWILIO_TEMPLATE_MAINTENANCE_CONFIRMATION=HX...
TWILIO_TEMPLATE_MAINTENANCE_REMINDER=HX...
TWILIO_TEMPLATE_COMPLAINT_CONFIRMATION=HX...
TWILIO_TEMPLATE_COMPLAINT_UPDATE=HX...
TWILIO_TEMPLATE_ADMIN_NOTIFICATION=HX...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### 4.3 Clone Repository (First Time Only)
```bash
# Clone your repo
git clone https://github.com/yourusername/greensthree-bms.git .

# Or use GitHub Actions (recommended)
```

### 4.4 Update Nginx Config
```bash
nano nginx.conf
```

Replace `yourdomain.com` with your actual domain name (2 occurrences).

### 4.5 Build and Start with Docker Compose
```bash
# Build and start containers
docker-compose up -d --build

# Check container status
docker ps

# Check logs
docker-compose logs -f app
```

---

## ⏰ Step 5: Setup Cron Jobs

```bash
# Run the cron setup script
./setup-cron.sh

# Verify cron jobs are installed
crontab -l

# Test a cron job manually
curl -X POST http://localhost:3000/api/ping
```

---

## 🔄 Step 6: Enable GitHub Actions CI/CD

### 6.1 Verify Workflow File
The `.github/workflows/deploy.yml` file is already created in your repository.

### 6.2 Generate SSH Key for GitHub Actions
```bash
# On your VPS
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""

# Add public key to authorized_keys
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys

# Copy private key (add this to GitHub Secrets as VPS_SSH_KEY)
cat ~/.ssh/github-actions
```

### 6.3 Test Deployment
```bash
# Make a small change and push to main branch
git add .
git commit -m "test: trigger deployment"
git push origin main

# Watch GitHub Actions tab for deployment progress
```

### 6.4 Deployment Flow
1. **Push to main/master** → GitHub Actions triggered
2. **Build & Test** → Application built and tested
3. **Docker Image** → Docker image created
4. **Deploy** → Image transferred to VPS
5. **Health Check** → Verify deployment success

---

## 🔍 Step 7: Monitoring & Maintenance

### 7.1 View Application Logs
```bash
# View all logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# View nginx logs
docker-compose logs -f nginx
```

### 7.2 Monitor Container Health
```bash
# Check container status
docker ps

# View container resource usage
docker stats

# Check health status
curl http://localhost:3000/api/ping
```

### 7.3 Restart Containers
```bash
# Restart all containers
docker-compose restart

# Restart app only
docker-compose restart app

# Restart nginx only
docker-compose restart nginx
```

### 7.4 Update Application
```bash
# Pull latest changes
cd /opt/greensthree-bms
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Or let GitHub Actions handle it automatically
```

---

## 🛡️ Step 8: Security Hardening

### 8.1 SSH Security
```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Disable root login (after creating a sudo user)
PermitRootLogin no

# Disable password authentication
PasswordAuthentication no

# Restart SSH
systemctl restart sshd
```

### 8.2 Fail2Ban (Block Brute Force Attacks)
```bash
# Install Fail2Ban
apt install fail2ban -y

# Enable and start
systemctl enable fail2ban
systemctl start fail2ban
```

### 8.3 Regular Updates
```bash
# Create update script
cat > /root/update.sh << 'EOF'
#!/bin/bash
apt update
apt upgrade -y
apt autoremove -y
docker system prune -af --volumes
EOF

chmod +x /root/update.sh

# Schedule weekly updates (every Sunday at 3 AM)
echo "0 3 * * 0 /root/update.sh" | crontab -
```

---

## 💰 Step 9: Cost Optimization Tips

### 9.1 Image Optimization
- ✅ Using multi-stage Docker builds (already implemented)
- ✅ Using Alpine Linux base image (smaller size)
- ✅ Caching npm dependencies

### 9.2 Resource Optimization
```bash
# Limit container resources in docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 2G
```

### 9.3 Database Optimization
- Use Supabase Free Tier (500 MB database, 50,000 monthly active users)
- Enable Row Level Security (already implemented)
- Use connection pooling

### 9.4 CDN for Static Assets (Optional)
- Use Cloudflare Free CDN in front of your VPS
- Reduces bandwidth costs
- Improves performance globally

---

## 🔄 Step 10: Backup Strategy

### 10.1 Database Backups
```bash
# Supabase handles database backups automatically
# To export manually, use Supabase dashboard or API
```

### 10.2 Application Backups
```bash
# Create backup script
cat > /root/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/greensthree-bms

# Keep only last 7 days of backups
find $BACKUP_DIR -name "app_*.tar.gz" -mtime +7 -delete
EOF

chmod +x /root/backup.sh

# Schedule daily backups (2 AM)
echo "0 2 * * * /root/backup.sh" | crontab -
```

---

## 🐛 Troubleshooting

### Issue: Container won't start
```bash
# Check logs
docker-compose logs app

# Check if port 3000 is in use
lsof -i :3000

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

### Issue: SSL certificate errors
```bash
# Verify certificate files exist
ls -la /opt/greensthree-bms/ssl/

# Renew certificate
certbot renew --force-renewal
cp /etc/letsencrypt/live/yourdomain.com/*.pem /opt/greensthree-bms/ssl/
docker-compose restart nginx
```

### Issue: Cron jobs not running
```bash
# Check cron service
systemctl status cron

# View cron logs
journalctl -u cron -f

# Test cron job manually
curl -X POST http://localhost:3000/api/cron/booking-reminder
```

### Issue: High memory usage
```bash
# Check memory usage
free -h
docker stats

# Restart containers to free memory
docker-compose restart

# Add swap space if needed
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
```

---

## 📚 Additional Resources

- [Dockploy Documentation](https://dockploy.com/docs)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Hostinger VPS Tutorials](https://www.hostinger.com/tutorials/vps)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## ✅ Deployment Checklist

- [ ] VPS purchased and configured
- [ ] Docker and Dockploy installed
- [ ] Domain pointed to VPS IP
- [ ] SSL certificate obtained and configured
- [ ] GitHub secrets configured
- [ ] Environment variables set on VPS
- [ ] Application deployed and running
- [ ] Nginx reverse proxy configured
- [ ] Cron jobs setup and tested
- [ ] GitHub Actions CI/CD tested
- [ ] Monitoring and logging configured
- [ ] Backup strategy implemented
- [ ] Security hardening completed

---

## 🎉 Success!

Your Greens Three BMS is now deployed on Hostinger VPS with:
- ✅ Automatic deployments via GitHub Actions
- ✅ SSL/HTTPS enabled
- ✅ Cron jobs running
- ✅ 50-85% cost reduction
- ✅ Full control over infrastructure
- ✅ Scalable and stable architecture

**Next Steps:**
1. Test all application features
2. Monitor performance for a week
3. Set up application monitoring (optional: UptimeRobot, Sentry)
4. Document any custom configurations

For support, refer to the troubleshooting section or create an issue in the GitHub repository.
