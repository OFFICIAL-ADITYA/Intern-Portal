# Known Issues, Limitations & Future Work

**Last Updated:** 2026-11-04  
**Project:** UPTOSKILL Intern Portal  
**Document Version:** 4.0.0

---

## 1. Known Issues & Upstream Dependency Limitations

### 1.1 SheetJS (`xlsx`) Upstream Security Warning
- **Status:** Documented / Accepted Risk
- **Details:** `npm audit` flags a prototype pollution advisory in the `xlsx` SheetJS library. The package is used strictly for server-side generation of administrative analytics exports (`.xlsx` format), and does **not** parse untrusted external user input.
- **Mitigation / Next Step:** Migrate spreadsheet export routines to a modern alternative like `exceljs` in the next sprint.

### 1.2 Single Running Instance Requirement for Cron Jobs
- **Status:** Operational Constraint
- **Details:** Background jobs (`internshipStatus.job.js` and `retention.job.js`) run using in-process `node-cron`. If the backend is horizontally scaled across multiple container instances, jobs would run concurrently on each instance.
- **Mitigation / Next Step:** Adopt distributed job locking using Redis (`redlock`) or dedicated worker queues (e.g., BullMQ / Celery).

---

## 2. Platform Architectural Limitations

1. **Single Internship Assignment per Intern**:
   - Currently, the `users` schema embeds a single `internshipDetails` subdocument. Interns who complete a cohort and enroll in a second consecutive internship (e.g. transitioning from Web Dev to AI/ML) require a new user document or manual profile updates.
2. **Synchronous PDF Rendering**:
   - High-concurrency finalization calls render Chromium PDFs synchronously within request cycles. Under intense load (> 50 simultaneous finalizations), rendering should be queued asynchronously via BullMQ.
3. **Polling-Based Notification Delivery**:
   - In-app notification updates poll the server every 30 seconds. While polling gracefully pauses on hidden tabs, a WebSocket or Server-Sent Events (SSE) connection would provide instant, push-based delivery with lower bandwidth.

---

## 3. Future Roadmap & Enhancement Proposals

### 3.1 Bulk Intern Import (CSV / Excel)
- Allow administrators to upload a batch `.csv` file containing hundreds of incoming interns, auto-validating domain assignments and queuing enrollment emails.

### 3.2 Multiple Internships & Alumni Portal
- Refactor `internshipDetails` into an array of `Enrollment` subdocuments so past interns can access multiple historical certificates under a single persistent login.

### 3.3 Blockchain / OpenBadges Verification Standard
- Augment the current SHA-256 / verifyId QR architecture with W3C Verifiable Credentials and OpenBadges 3.0 standards for decentralized university portability.

### 3.4 Direct Chatbot Knowledge Base Sync
- Connect the FastAPI support chatbot FAISS vector store directly to MongoDB knowledge collections so newly created policy FAQs update the AI embeddings without requiring server restarts.

