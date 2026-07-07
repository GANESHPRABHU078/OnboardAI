# Deployment Guide

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Bun | 1.0+ | JavaScript runtime and package manager |
| Docker | 20.10+ | Container runtime |
| Docker Compose | 2.0+ | Multi-container orchestration |
| Git | 2.x | Source control |
| (AWS) AWS CLI | 2.x | EC2 deployment (optional) |

---

## Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/enterprise-ai-onboarding.git
cd enterprise-ai-onboarding

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your JWT_SECRET and ZAI_API_KEY

# 4. Initialize the database
bun run db:push

# 5. Seed demo data (optional)
# Start the dev server first:
bun run dev
# Then in another terminal:
curl -X POST http://localhost:3000/api/seed

# 6. Open http://localhost:3000
```

---

## Docker Deployment

### Build and Run with Docker Compose (Recommended)

```bash
# Navigate to the docker directory
cd docker

# Set required environment variables
export JWT_SECRET="your-production-jwt-secret-min-32-chars"
export ZAI_API_KEY="your-z-ai-api-key"

# Build and start all services
docker compose up -d --build

# Verify services are running
docker compose ps

# Seed the database
curl -X POST http://localhost/api/seed

# View logs
docker compose logs -f app
```

The application is accessible at `http://<your-server-ip>` on port 80.

### Standalone Docker Build

```bash
# Build the application image
docker build -f docker/Dockerfile -t onboardai-app:latest .

# Run the container
docker run -d \
  --name onboardai \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="file:/app/data/custom.db" \
  -e JWT_SECRET="your-jwt-secret" \
  -v onboardai-data:/app/data \
  onboardai-app:latest
```

---

## AWS EC2 Deployment

### Step-by-Step Guide

```bash
# 1. Launch an EC2 instance
#    - AMI: Ubuntu 22.04 LTS
#    - Instance type: t3.medium (2 vCPU, 4 GB RAM)
#    - Storage: 20 GB gp3
#    - Security Group: Allow inbound TCP 22, 80, 443

# 2. SSH into the instance
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 4. Install Docker Compose
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 5. Clone the repository
git clone https://github.com/your-org/enterprise-ai-onboarding.git
cd enterprise-ai-onboarding

# 6. Configure environment
export JWT_SECRET="$(openssl rand -hex 32)"
export ZAI_API_KEY="your-z-ai-api-key"

# 7. Build and deploy
cd docker
docker compose up -d --build

# 8. Seed the database
sleep 10  # Wait for the app to be healthy
curl -X POST http://localhost/api/seed

# 9. Verify
curl http://localhost/api/auth/me
# Should return: {"error":"Unauthorized"}
```

### Configure Elastic IP (Recommended)

```bash
# From your local machine with AWS CLI:
aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id i-<your-id> --allocation-id eipalloc-<id>
```

---

## Nginx Configuration

The project includes a production-ready Nginx configuration in `docker/nginx.conf`:

```nginx
upstream nextjs_upstream {
    server app:3000;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 50M;     # Allow large file uploads

    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;  # Timeout for AI generation
        proxy_connect_timeout 75s;
    }

    location /_next/static {
        proxy_pass http://nextjs_upstream;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

To use Nginx without Docker Compose, install it directly:

```bash
sudo apt-get install -y nginx
sudo cp docker/nginx.conf /etc/nginx/sites-available/onboardai
# Edit upstream to point to localhost:3000 instead of app:3000
sudo ln -s /etc/nginx/sites-available/onboardai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## SSL / HTTPS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d onboarding.yourdomain.com

# Certbot will automatically modify nginx.conf to:
#   - Redirect HTTP → HTTPS
#   - Add SSL certificate paths
#   - Enable HSTS header

# Verify auto-renewal
sudo certbot renew --dry-run
```

Update `docker/nginx.conf` to add SSL before deploying, or use a cloud load balancer with TLS termination.

---

## Environment Configuration

| Variable | Required | Production Value | Description |
|----------|----------|-----------------|-------------|
| `NODE_ENV` | Yes | `production` | Enables Next.js optimizations |
| `DATABASE_URL` | Yes | `file:/app/data/custom.db` | SQLite path (persistent volume) |
| `JWT_SECRET` | **Yes** | 64+ char random string | **Change from default** |
| `ZAI_API_KEY` | For AI features | Your API key | Enables AI plan/assessment generation |
| `PORT` | No | `3000` | Internal app port |
| `HOSTNAME` | No | `0.0.0.0` | Bind address inside container |

**Generate a secure JWT secret:**

```bash
openssl rand -hex 32
```

---

## Monitoring and Logging

### Application Logs

```bash
# Docker Compose
docker compose logs -f app          # Follow logs
docker compose logs --tail 100 app  # Last 100 lines

# Standalone Docker
docker logs -f onboardai
```

### Health Check

The Docker Compose configuration includes a built-in health check:

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/auth/login"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Database Backup

```bash
# Backup SQLite database
docker cp onboardai-app:/app/data/custom.db ./backup-$(date +%Y%m%d).db

# Restore from backup
docker cp ./backup-20250101.db onboardai-app:/app/data/custom.db
docker compose restart app
```

For automated backups, add a cron job:

```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * docker cp onboardai-app:/app/data/custom.db /backups/onboardai-$(date +\%Y\%m\%d).db && find /backups -name "*.db" -mtime +30 -delete
```

---

## Scaling Considerations

| Aspect | Current Limitation | Scaling Strategy |
|--------|-------------------|-----------------|
| **Database** | Single SQLite file | Migrate to PostgreSQL via Prisma (change `provider` and `DATABASE_URL`) |
| **File Storage** | Local `/uploads/` | Migrate to S3-compatible object storage |
| **Embeddings** | In-memory cosine search | Use pgvector (PostgreSQL) or Pinecone for large-scale RAG |
| **AI Generation** | Synchronous, single request | Add a job queue (BullMQ) for async AI generation |
| **Sessions** | Database-backed | Add Redis for session caching |
| **Static Assets** | Next.js built-in | Serve via CDN (CloudFront, Cloudflare) |
| **Instances** | Single container | Use Docker Swarm, ECS, or Kubernetes with shared database |

---

## Troubleshooting

### Database Locked Error

SQLite uses file-level locking. In production with concurrent writes:

```
Error: Database is locked
```

**Fix:** Ensure only one instance is writing. For high concurrency, migrate to PostgreSQL.

### AI Generation Timeout

AI requests may take 30+ seconds. If Nginx returns 504:

```bash
# Increase proxy_read_timeout in nginx.conf
proxy_read_timeout 600s;
```

### File Upload Fails (413 Request Entity Too Large)

```bash
# Increase client_max_body_size in nginx.conf
client_max_body_size 100M;
```

### Seed Endpoint Returns 400

```
{"message":"Database already has data. Clear it first before seeding."}
```

**Fix:** Reset the database before re-seeding:

```bash
bun run db:push --force-reset  # Destructive — clears all data
curl -X POST http://localhost:3000/api/seed
```

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000
# Kill the process or change the port
PORT=3001 bun run dev
```

### Container Health Check Failing

```bash
# Check container logs
docker compose logs app

# Restart the container
docker compose restart app

# Rebuild if code changed
docker compose up -d --build
```