# UPTOSKILL – Internship Management Portal

**Version:** 4.0.0 (Production Release)  
**Last Updated:** 2026-11-04  
**Tech Stack:** React 18, Vite, Node.js 20+, Express 5, MongoDB (Mongoose 9), Puppeteer, FastAPI (Python RAG Chatbot)

---

## 1. Project Overview

The **UPTOSKILL Intern Portal** is an enterprise-grade web application automating the end-to-end internship certificate lifecycle — from enrollment and milestone tracking to certificate review, visual template design, cryptographic PDF generation, public QR verification, and automated AI support assistance.

It eliminates manual coordination by providing dedicated, role-based workflows for:
- **Interns**: Code-based authentication, mandatory password setup, certificate requests, live progress tracking, and AI guidance.
- **Team Leaders**: Domain-scoped review queues, request verification/forwarding, rejection with mandatory feedback, and upcoming completions monitoring.
- **Administrators**: User provisioning, visual certificate drafting (GrapesJS), vector PDF generation (Puppeteer), certificate revocation, audit logs, and executive analytics.
- **Public**: Instant mobile QR-code verification verifying certificate legitimacy without leaking personal identifiable data.

---

## 2. Documentation Directory

Detailed specifications, architecture blueprints, and operations runbooks are documented in [`docs/`](./docs):

| Document | Purpose & Contents |
| :--- | :--- |
| **[`docs/architecture.md`](./docs/architecture.md)** | Single user model, RBAC, certificate state machine, Puppeteer engine, cron jobs, chatbot proxy architecture, and Mermaid diagrams. |
| **[`docs/api.md`](./docs/api.md)** | Full API reference with HTTP methods, URLs, role permissions, request/response payloads, and error codes. |
| **[`docs/data-model.md`](./docs/data-model.md)** | MongoDB collections (`users`, `certificate_requests`, `certificates`, `audit_logs`, `notifications`), indexes, and relationships. |
| **[`docs/deployment.md`](./docs/deployment.md)** | Production hosting (Render/Railway/Vercel), environment variables, Docker/Chromium setup, persistent storage, backup & restore. |
| **[`docs/user-guide-intern.md`](./docs/user-guide-intern.md)** | Intern manual: first-time sign-in, password establishment, certificate requests, tracking, PDF download, and AI chatbot usage. |
| **[`docs/user-guide-teamleader.md`](./docs/user-guide-teamleader.md)** | Team Leader manual: domain scoping, review queue, forward/reject with feedback, and upcoming completions. |
| **[`docs/user-guide-admin.md`](./docs/user-guide-admin.md)** | Admin manual: user provisioning, template builder, draft customization, finalization, revocations, and analytics. |
| **[`docs/operations.md`](./docs/operations.md)** | SRE runbook: daily 2 AM cron jobs, audit log inspection, retrying failed PDFs, unarchiving interns, and troubleshooting. |
| **[`docs/known-issues-and-future-work.md`](./docs/known-issues-and-future-work.md)** | Architectural constraints, SheetJS advisory note, and future roadmap (bulk CSV import, multi-internship support). |
| **[`docs/demo-script.md`](./docs/demo-script.md)** | 10 to 15 minute walkthrough script with exact test credentials and order of screens for the final release presentation. |

---

## 3. Technology Stack

- **Frontend**: React 18, React Router 6, Vite, Lucide Icons, Axios, GrapesJS (visual certificate editor), Recharts.
- **Backend**: Node.js 20+, Express 5, Mongoose 9, Helmet, CORS, Express-Rate-Limit, Cookie-Parser, Handlebars, Puppeteer, QRCode.
- **AI Support Chatbot**: Python 3.10+, FastAPI, Uvicorn, LangChain, FAISS Vector Index, Groq LLM (Llama-3 / GPT-OSS).
- **Database & Cache**: MongoDB 7+, Redis (with in-memory fallback).
- **Communication & Email**: Brevo SMTP (transactional alerts & password resets).

---

## 4. Repository Structure

```
Intern_Portal/
├── backend/
│   ├── data/                 # Sample datasets and import files
│   ├── scripts/              # Migration, volume seeding, load testing & admin provisioning
│   │   ├── createAdmin.js        # Script to create initial Admin user from environment
│   │   ├── seedRealisticVolume.js# Seeds 500 interns & 3,000 requests for explain plan checks
│   │   ├── loadTest.js           # Lightweight benchmark runner for API latency testing
│   │   └── backfill*.js          # Migration scripts for schema integrity
│   ├── seeds/                # Base certificate templates and department seeders
│   ├── src/
│   │   ├── config/           # Database & environment configuration
│   │   ├── controllers/      # Business logic handlers (auth, intern, admin, TL, verify, analytics)
│   │   ├── jobs/             # 2:00 AM status sync & 2:05 AM data retention cron tasks
│   │   ├── middlewares/      # verifyAuth, checkRole, rateLimiters, helmet
│   │   ├── models/           # Mongoose schemas (User, CertificateRequest, Certificate, etc.)
│   │   ├── routes/           # Express router endpoints
│   │   ├── services/         # Certificate PDF rendering, email dispatch, notification service
│   │   ├── utils/            # Append-only audit logger, QR code generator
│   │   └── validators/       # Input sanitization and Express validators
│   ├── tests/                # 11 automated test suites (126 unit & integration tests)
│   ├── server.js             # Entry point with uncaught error handlers & startup checks
│   └── package.json
├── frontend/
│   ├── public/               # Favicon, SVGs, Netlify _redirects SPA rule
│   ├── src/
│   │   ├── app/              # App entry with route-level code splitting (React.lazy)
│   │   ├── features/
│   │   │   ├── admin/        # Admin dashboard, template editor, review page, analytics
│   │   │   ├── auth/         # Login, forgot password, reset password
│   │   │   ├── intern/       # Intern dashboard, request modal, ChatWidget AI assistant
│   │   │   ├── public/       # Public certificate verification page
│   │   │   ├── shared/       # Error boundary, notification bell, toast alerts, theme toggle
│   │   │   └── teamleader/   # TL review queue, interns list, upcoming completions
│   ├── vercel.json           # Vercel SPA rewrite configuration
│   ├── vite.config.js        # Vite bundler configuration (sourcemaps disabled in prod)
│   └── package.json
├── Web_Support_Chatbot/
│   ├── backend/              # Python FastAPI RAG assistant with FAISS index & Groq
│   │   ├── main.py           # FastAPI service endpoint (/api/chat, /api/health)
│   │   ├── ingest.py         # Knowledge base document indexer
│   │   └── faiss_index/      # Precomputed semantic embeddings
│   └── frontend/             # Standalone test interface for chatbot
└── docs/                     # Comprehensive architecture and user guides
```

---

## 5. Quick Start & Local Setup

### Prerequisites
- Node.js 20 or newer (`node -v`)
- Python 3.10 or newer (`python --version`)
- MongoDB running locally (`mongodb://127.0.0.1:27017/intern_portal`) or a MongoDB Atlas URI

### 1. Backend Setup
```bash
cd backend
npm install

# Copy example environment configuration
cp .env.example .env

# Seed initial certificate templates
npm run seed:templates

# Provision the first Admin user
ADMIN_EMAIL="admin@uptoskill.com" ADMIN_PASSWORD="AdminPassword2026!" node scripts/createAdmin.js

# Start backend development server
npm run dev
```

### 2. Frontend Setup
In a second terminal:
```bash
cd frontend
npm install

# Build for production or start development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 3. Support Chatbot Service Setup
In a third terminal:
```bash
cd Web_Support_Chatbot/backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

---

## 6. Running Tests & Quality Verification

### 6.1 Automated Test Suite
The backend contains 11 automated test suites covering all lifecycle states, RBAC boundaries, public verification, retention policies, and the chatbot proxy:
```bash
cd backend
npm test
```
*Current test status:* **126 tests passing, 0 failing**.

### 6.2 Realistic Volume Seeding & Explain Plans
To verify MongoDB index usage on large datasets (500 interns and 3,000 requests):
```bash
cd backend
node scripts/seedRealisticVolume.js
```

### 6.3 Light Load Testing
To record endpoint response times and error rates under concurrency:
```bash
cd backend
node scripts/loadTest.js
```

### 6.4 Security Audit
```bash
cd backend
npm audit
```

---

## 7. Demo Accounts for Testing

| Role | Email | Initial Password / Code |
| :--- | :--- | :--- |
| **Admin** | `admin@uptoskill.com` | Configured via `scripts/createAdmin.js` |
| **Team Leader** | `tl.sarah@uptoskill.com` | `TLSecret2026!` |
| **Intern** | `intern.demo@uptoskill.com` | `UTS-2026-DEMO` |

Follow [`docs/demo-script.md`](./docs/demo-script.md) for the 10-15 minute presentation walkthrough.
