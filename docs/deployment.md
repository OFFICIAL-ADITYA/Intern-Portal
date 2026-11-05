# Deployment & Environment Operations Guide

**Last Updated:** 2026-11-04  
**Project:** UPTOSKILL Intern Portal  
**Document Version:** 4.0.0 (Production Release)

---

## 1. Hosting Architecture & Architecture Options

The application consists of three decoupled components:
1. **Node.js/Express Backend**: Runs API routes, certificate generation via Puppeteer Chromium, and scheduled daily cron jobs. Recommended: Render, Railway, AWS ECS, or Ubuntu VPS.
2. **React/Vite Frontend**: Pure static assets and SPA routes. Recommended: Vercel, Netlify, Cloudflare Pages, or AWS S3/CloudFront.
3. **FastAPI AI Support Chatbot**: Python 3.10+ service using FAISS embeddings and Groq LLM API. Can be hosted alongside the backend on an internal private network or microservice container.

---

## 2. Environment Variables Specification

Ensure every variable is populated in your hosting provider's dashboard:

| Variable Name | Required | Example / Recommended Value | Purpose |
| :--- | :--- | :--- | :--- |
| `MONGO_URI` | **Yes** | `mongodb+srv://admin:pwd@cluster.net/uptoskill_prod` | Production MongoDB connection string |
| `JWT_SECRET` | **Yes** | `f8c4e0b5a31...` (64 random hex chars) | Secret used to sign session cookies |
| `NODE_ENV` | **Yes** | `production` | Enables security headers, disables stack traces |
| `PORT` | No | `3000` (or host assigned `$PORT`) | Server listen port |
| `FRONTEND_URL` | **Yes** | `https://portal.uptoskill.com` | CORS whitelist and base URL for verification links |
| `BREVO_SMTP_USER`| **Yes** | `7a12b3@smtp-brevo.com` | Brevo SMTP account user |
| `BREVO_SMTP_KEY` | **Yes** | `xsmtpsib-...` | Brevo API key for transactional emails |
| `BREVO_SENDER_EMAIL`| **Yes**| `support@uptoskill.com` | Verified sender address |
| `EMAIL_FROM` | No | `UPTOSKILL Notifications <support@uptoskill.com>` | Sender header formatted name |
| `JOB_TIMEZONE` | No | `Asia/Kolkata` | Timezone for 2:00 AM daily cron execution |
| `DRY_RUN` | No | `false` | When `true`, cron jobs log without modifying data |
| `CHATBOT_API_URL`| **Yes** | `http://127.0.0.1:8000/api/chat` | URL for Python FastAPI chatbot proxy |
| `STORAGE_PATH` | No | `/mnt/data/certificates` | Persistent storage directory for PDF files |

### Frontend Variables (Vite):
| Variable Name | Required | Example Value | Purpose |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Yes** | `https://api.uptoskill.com` | Target backend URL for API calls |

---

## 3. Step-by-Step Deployment Procedure

### Phase 1: Database Setup
1. Provision a MongoDB Atlas M10+ replica set or self-hosted cluster named `uptoskill_prod`.
2. Restrict IP access to your backend server IPs only.
3. Run seeds and template initialization:
```bash
cd backend
npm run seed:templates
```

### Phase 2: Provision First Administrator
Run the secure administrator provisioning script using environment variables:
```bash
ADMIN_EMAIL="admin@uptoskill.com" ADMIN_PASSWORD="YourSecurePassword123!" node scripts/createAdmin.js
```

### Phase 3: Backend Deployment (Docker / VPS / PaaS)
When running on Linux or Docker, install Chromium dependencies required by Puppeteer:
```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
EXPOSE 3000
CMD ["node", "server.js"]
```

### Phase 4: Frontend Deployment (Vercel / Netlify)
1. Link your Git repository to Vercel or Netlify.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Set Environment Variable: `VITE_API_URL=https://your-backend-api.com`
5. The SPA redirect rule is automatically loaded from `public/_redirects` (Netlify) or `vercel.json` (Vercel).

---

## 4. Database Backup & Disaster Recovery

### Creating a Database Backup
```bash
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/uptoskill_prod" --out=/backups/backup-$(date +%F)
```

### Restoring from Backup
```bash
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/uptoskill_prod" --drop /backups/backup-2026-11-04/uptoskill_prod
```

---

## 5. Rollback Strategy
If an unexpected issue occurs following a production release:
1. **Frontend Rollback**: Instant one-click rollback in Vercel/Netlify dashboard to the previous Git deployment ID.
2. **Backend Rollback**: Re-deploy previous Git tag or Docker container digest:
```bash
git checkout tags/v3.8.0
npm install
npm restart
```
3. **Database Migration Safety**: All database schemas in this project are backwards-compatible and non-destructive.

