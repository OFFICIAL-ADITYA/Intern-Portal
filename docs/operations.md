# Operations & Maintenance Runbook

**Last Updated:** 2026-11-04  
**Audience:** Site Reliability Engineers (SRE), DevOps & Support Engineers  
**System:** UPTOSKILL Intern Portal v4.0.0

---

## 1. Daily Cron Jobs & Automated Scheduling

Two daily background tasks execute automatically using the node-cron scheduler configured in `Asia/Kolkata` timezone:

### 1.1 Internship Status Job (`0 2 * * *` - 2:00 AM IST)
- **Source File:** `backend/src/jobs/internshipStatus.job.js`
- **Actions:**
  - Moves interns with `status: 'upcoming'` to `'ongoing'` when `startDate <= today`.
  - Moves interns with `status: 'ongoing'` to `'completed'` when `endDate < today`.
- **Manual Execution (CLI):**
  ```bash
  node -e "import('./src/jobs/internshipStatus.job.js').then(m => m.runInternshipStatusJob({ dryRun: false }))"
  ```

### 1.2 Retention & Archival Job (`5 2 * * *` - 2:05 AM IST)
- **Source File:** `backend/src/jobs/retention.job.js`
- **Actions:**
  - Sends warning emails to interns 7 days before archival.
  - Archives interns past their grace period (`isArchived = true`).
  - Purges PII from archived interns past the purge threshold (`fullName = 'Former Intern ...'`, `personalDataPurged = true`).
- **Dry-Run Testing:**
  To safely inspect what accounts would be modified without executing database changes:
  ```bash
  DRY_RUN=true node -e "import('./src/jobs/retention.job.js').then(m => m.runRetentionJob({ dryRun: true }))"
  ```

---

## 2. Reading and Inspecting Audit Logs

All sensitive events write an append-only document to the `audit_logs` collection:

### Key Event Actions
- `LOGIN` / `LOGOUT`: User authentication and sign-out.
- `CERTIFICATE_FINALIZED`: Administrator rendered and finalized a credential.
- `CERTIFICATE_REVOKED`: Administrator revoked a finalized certificate.
- `CERTIFICATE_UNREVOKED`: Administrator reversed a revocation.
- `ARCHIVE_WARNING`: Automated retention warning email dispatched.
- `INTERN_ARCHIVED`: Automated transition to archived status.
- `INTERN_RESTORED`: Administrator restored an archived intern.

### Direct Database Query (MongoDB Shell)
```javascript
// Find recent revocations
db.audit_logs.find({ action: "CERTIFICATE_REVOKED" }).sort({ createdAt: -1 }).limit(10);

// Inspect actions taken by a specific administrator
db.audit_logs.find({ actorId: ObjectId("64e0a123bcdef0123456789a") }).sort({ createdAt: -1 });
```

---

## 3. Retrying Failed Certificate PDF Generation

If a network or font loading failure causes PDF rendering to fail during finalization:
1. The certificate status remains `draft`.
2. Ensure the headless Chromium environment has sufficient memory (`--disable-dev-shm-usage` flag is active).
3. In the Admin Dashboard:
   - Go to **Pending Finalization**.
   - Click **Review Draft**.
   - Click **Finalize Certificate** again.
4. The system will re-render the HTML canvas, write the PDF buffer, and update the certificate status to `finalized`.

---

## 4. Restoring an Archived Intern

If a completed intern contacts support requesting an extension or certificate access:
1. Log in to the Admin Dashboard.
2. Navigate to **Archived Interns**.
3. Search by name or email.
4. Click **Restore Intern**.
5. The system sets `isArchived: false` and clears `archivedAt`, allowing immediate login.

---

## 5. Common Errors & Troubleshooting

### Issue 1: `FATAL: Server startup aborted. Missing required environment variable(s)`
- **Cause:** Missing required keys in `.env` or cloud container environment.
- **Fix:** Check `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, `BREVO_SMTP_USER`, and `BREVO_SMTP_KEY`.

### Issue 2: `PDF rendering failed: Could not find Chromium`
- **Cause:** Linux server lacks Chromium system libraries.
- **Fix:** Install system packages `chromium`, `fonts-ipafont-gothic`, `fonts-freefont-ttf` or set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.

### Issue 3: `Too many login attempts. Please try again after 15 minutes.`
- **Cause:** Rate limiter triggered by > 5 invalid credentials from the same IP/email.
- **Fix:** Wait for the `Retry-After` window to expire, or flush Redis cache / restart in staging.

### Issue 4: Chatbot Proxy returns fallback message
- **Cause:** The Python FastAPI chatbot service on port 8000 is not running or timed out.
- **Fix:** Start the chatbot service with `python -m uvicorn main:app --port 8000` inside `Web_Support_Chatbot/backend`. Verify Groq API key is valid.

