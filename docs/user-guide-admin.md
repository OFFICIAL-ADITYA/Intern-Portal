# Administrator Guide & Manual

**Last Updated:** 2026-11-04  
**Audience:** System Administrators & Portal Managers  
**Portal Version:** 4.0.0

---

## 1. User Provisioning & Management

### Creating New Interns and Team Leaders
1. Log in to the Administrator Dashboard at `/admin/dashboard`.
2. Navigate to **User Management** in the left navigation sidebar.
3. Click **Add New User**.
4. Select the user role:
   - **`teamleader`**: Enter full name, corporate email, and default password.
   - **`intern`**: Enter full name, email, domain, start date, end date, and select their assigned Team Leader from the dropdown.
5. Click **Create User**.
   - An enrollment email is automatically dispatched with the intern's generated `internCode`.

---

## 2. Certificate Drafting, Visual Editing & Finalization

When a Team Leader forwards a request, it appears in **Pending Finalization**:

### Step 1: Generate Draft
1. Click **Create Draft** on the forwarded request.
2. The system loads the active Handlebars template for that certificate type and compiles it with the intern's verified profile data (name, domain, completion date, certificate number).

### Step 2: Visual Review & Editing
1. Click **Open Template Editor**.
2. An interactive visual studio (GrapesJS) loads, displaying the certificate canvas.
3. You can modify text, adjust layout padding, reposition authorized digital signatures, or format borders.
4. Click **Save Changes** to persist the updated HTML content on the draft.

### Step 3: Finalize and Issue
1. Click **Finalize Certificate**.
2. The Puppeteer rendering engine generates a high-resolution, vector PDF from the customized HTML.
3. An unguessable `verifyId` and cryptographic QR code are stamped into the document.
4. The PDF is saved to persistent storage, and an automated email containing the download link is sent to the intern.

---

## 3. Certificate Revocation & Unrevocation

If a credential is found to be issued in error or compromised:
1. Locate the certificate in **Issued Certificates**.
2. Click **Revoke**.
3. Enter the mandatory **Revocation Reason** (e.g., *"Academic dishonesty detected in post-internship evaluation"*).
4. Click **Confirm Revoke**.
   - The certificate is immediately flagged as `isRevoked: true`.
   - The intern receives a revocation notice.
   - Anyone scanning the physical QR code or visiting `/verify/:verifyId` will immediately see an alert: **Revoked Credential**.
5. *Note: If revoked accidentally, click **Unrevoke Certificate** to restore it to valid status.*

---

## 4. Audit Log Inspection & Compliance Export

Every privileged administrative action is captured in the append-only `AuditLog`:
1. Navigate to **Audit Logs** at `/admin/audit-logs`.
2. Filter logs by:
   - **Action**: `LOGIN`, `CERTIFICATE_FINALIZED`, `CERTIFICATE_REVOKED`, `INTERN_RESTORED`, etc.
   - **Date Range**: Today, Past 7 Days, Past 30 Days, Custom Range.
   - **Actor Role**: Admin, Team Leader, Intern, System.
3. Click **Export Audit Trail (CSV)** to download a compliant audit spreadsheet for internal or external review.

---

## 5. Analytics & Performance Intelligence

Navigate to the **Analytics** tab to access real-time executive KPI widgets:
- **Overview Metrics**: Total requests, average completion rate, active cohorts.
- **Request Volume Trends**: Multi-series line chart tracking submissions vs. completions over time.
- **Turnaround Velocity**: Detailed facet analysis showing average days spent in TL Review vs. Admin Drafting.
- **Team Leader Performance Table**: Throughput, approval ratio, and pending queue size per TL.
- **Overdue / Stuck Queue**: Highlights any request that has languished without review for more than 5 days.
- **Exporting**: Click **Export Analytics** to download data formatted as CSV or Excel (`.xlsx`).

---

## 6. Retention Policies & Restoring Archived Interns

1. Click **Retention Policy** under administrative settings.
2. Configure lifecycle thresholds:
   - **Grace Period (Days)**: Days between internship end date and account archival (Default: 30 days).
   - **Purge Period (Days)**: Days between archival and permanent redaction of personal data (Default: 90 days).
3. Click **Save Policy**.
4. To unarchive an intern who needs additional certificate access:
   - Go to **Archived Interns**.
   - Locate the student and click **Restore Account**.
   - The intern's account is restored to active status immediately.

