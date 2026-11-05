# API Reference Specification

**Last Updated:** 2026-11-04  
**Base URL:** `http://localhost:3000` (Production: Host root or `VITE_API_URL`)  
**Format:** JSON (`application/json`)  
**Security:** Cookie-based JWT (`token`), CORS whitelisted credentials, and Helmet headers.

---

## Response Status Code Standards
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Input validation failed or malformed request payload.
- `401 Unauthorized`: Missing or invalid session cookie/token.
- `403 Forbidden`: Authenticated user does not possess the required role or account is archived.
- `404 Not Found`: Requested resource or entity does not exist.
- `409 Conflict`: Business logic conflict (e.g. duplicate active certificate request).
- `429 Too Many Requests`: Rate limit exceeded (`Retry-After` header provided in seconds).
- `500 Internal Server Error`: Generic unexpected server error. (Production mode hides stack traces).

---

## 1. System & Monitoring

### `GET /api/health`
Checks backend and MongoDB replica connection status.
- **Allowed Roles:** Public / Uptime Monitors
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "uptoskill-backend",
  "database": "connected",
  "uptime": 1420,
  "timestamp": "2026-11-04T12:00:00.000Z"
}
```
- **Response `503 Service Unavailable`** (when DB is disconnected):
```json
{
  "status": "degraded",
  "service": "uptoskill-backend",
  "database": "disconnected",
  "uptime": 1420,
  "timestamp": "2026-11-04T12:00:00.000Z"
}
```

---

## 2. Authentication (`/api/auth`)

### `POST /api/auth/login`
Authenticates a user via email and password (or first-time intern code) and sets the `httpOnly` session cookie.
- **Allowed Roles:** Public (Rate limited: 5 attempts per 15 min per IP/email)
- **Request Body**:
```json
{
  "email": "intern@uptoskill.com",
  "password": "Password123!"
}
```
- **Response `200 OK`**:
```json
{
  "message": "Login successful",
  "user": {
    "id": "64e0a123bcdef0123456789a",
    "fullName": "Jane Doe",
    "email": "intern@uptoskill.com",
    "role": "intern",
    "hasPassword": true
  }
}
```

### `POST /api/auth/logout`
Clears session cookie and writes a `LOGOUT` entry to the Audit Log.
- **Allowed Roles:** Any authenticated user
- **Response `200 OK`**:
```json
{ "message": "Logged out successfully" }
```

### `GET /api/auth/get-me`
Fetches current authenticated profile from cookie token.
- **Allowed Roles:** Authenticated (`admin`, `teamleader`, `intern`)
- **Response `200 OK`**:
```json
{
  "user": {
    "id": "64e0a123bcdef0123456789a",
    "fullName": "Jane Doe",
    "email": "intern@uptoskill.com",
    "role": "intern"
  }
}
```

### `POST /api/auth/forgot-password`
Initiates a password reset flow, generating a secure token and emailing the reset link.
- **Allowed Roles:** Public (Rate limited: 3 requests per hour)
- **Request Body**: `{ "email": "user@uptoskill.com" }`
- **Response `200 OK`**: `{ "message": "If that email exists in our system, a password reset link has been sent." }`

### `POST /api/auth/reset-password/:token`
Resets password using valid token.
- **Request Body**: `{ "newPassword": "NewSecurePassword2026!" }`
- **Response `200 OK`**: `{ "message": "Password reset successful" }`

---

## 3. Intern Management & Chatbot (`/api/intern`)

### `GET /api/intern/profile`
- **Allowed Roles:** `intern`
- **Response `200 OK`**: Returns intern details, domain, start/end dates, team leader info, and mobile number.

### `PATCH /api/intern/profile`
- **Allowed Roles:** `intern`
- **Request Body**: `{ "mobileNo": "+919876543210" }` (Only mobile number is editable; all other keys stripped).
- **Response `200 OK`**: Updated profile object.

### `PATCH /api/intern/set-password`
- **Allowed Roles:** `intern`
- **Request Body**:
```json
{
  "currentSecret": "UTS-2026-0042",
  "newPassword": "MySecretPassword2026!"
}
```
- **Response `200 OK`**: `{ "message": "Password updated successfully", "passwordSetAt": "..." }`

### `POST /api/intern/request-certificate`
- **Allowed Roles:** `intern`
- **Request Body**:
```json
{
  "certificateType": "completion_certificate",
  "reason": "Completed all capstone deliverables on time."
}
```
- **Response `201 Created`**: Returns created `CertificateRequest` entity.
- **Response `409 Conflict`**: If another active request of the same type is pending.

### `GET /api/intern/requests`
- **Allowed Roles:** `intern`
- **Response `200 OK`**: List of requests submitted by current intern with progress status.

### `GET /api/intern/requests/:id/certificate/download`
- **Allowed Roles:** `intern` (Only own certificates; other interns receive 403 Forbidden).
- **Response `200 OK`**: Streams PDF binary with `Content-Disposition: attachment`.

### `POST /api/intern/chat` (Task M Chatbot Integration)
Proxies question to the internal AI support chatbot with intern-specific request context.
- **Allowed Roles:** `intern` (Rate limited: 30 requests per 15 min)
- **Request Body**: `{ "message": "When will my completion certificate be finalized?" }`
- **Response `200 OK`**:
```json
{
  "answer": "Your completion certificate request is currently **forwarded** and is in the final review queue with the Administration team. Approvals are typically finalized within 48-72 hours."
}
```

---

## 4. Team Leader Workflows (`/api/teamleader`)

### `GET /api/teamleader/requests-for-review`
- **Allowed Roles:** `teamleader`
- **Response `200 OK`**: Returns pending certificate requests from interns assigned to this TL.

### `PATCH /api/teamleader/requests/:id/review`
- **Allowed Roles:** `teamleader` (Blocked from reviewing other TLs' interns with 403)
- **Request Body (Forward)**: `{ "action": "forward" }`
- **Request Body (Reject)**: `{ "action": "reject", "rejectionReason": "Project report incomplete" }`
- **Response `200 OK`**: Updated request details.

### `GET /api/teamleader/interns`
- **Allowed Roles:** `teamleader`
- **Query Params:** `?page=1&limit=20&domain=Web+Development&search=Jane`
- **Response `200 OK`**: Paginated list of assigned interns.

### `GET /api/teamleader/upcoming-completions`
- **Allowed Roles:** `teamleader`
- **Response `200 OK`**: Interns finishing within the next 7 days.

---

## 5. Administration & Governance (`/api/admin`)

### `GET /api/admin/certificates/pending`
- **Allowed Roles:** `admin`
- **Response `200 OK`**: Returns requests forwarded by Team Leaders ready for draft creation.

### `POST /api/admin/certificates/draft`
- **Allowed Roles:** `admin`
- **Request Body**: `{ "requestId": "64e0a123bcdef0123456789a" }`
- **Response `201 Created`**: Returns draft Certificate document with compiled Handlebars HTML and temporary QR code.

### `PATCH /api/admin/certificates/:id/finalize`
- **Allowed Roles:** `admin`
- **Response `200 OK`**: Renders PDF via Puppeteer Chromium, writes to disk/storage, records verify ID and dispatches email.

### `PATCH /api/admin/certificates/:id/revoke`
- **Allowed Roles:** `admin`
- **Request Body**: `{ "reason": "Academic integrity breach" }`
- **Response `200 OK`**: `{ "message": "Certificate revoked successfully" }`

### `PATCH /api/admin/certificates/:id/unrevoke`
- **Allowed Roles:** `admin`
- **Response `200 OK`**: Restores revoked certificate status to valid.

### `GET /api/admin/audit-logs`
- **Allowed Roles:** `admin`
- **Query Params:** `?page=1&limit=50&action=CERTIFICATE_REVOKED&actorId=...`
- **Response `200 OK`**: Paginated immutable audit entries.

### `GET /api/admin/audit-logs/export`
- **Allowed Roles:** `admin`
- **Response `200 OK`**: Downloads audit trail as CSV formatted attachment.

### `GET /api/admin/archived-interns` & `PATCH /api/admin/archived-interns/:id/restore`
- **Allowed Roles:** `admin`
- **Response `200 OK`**: Lists or unarchives an intern prior to data purge.

---

## 6. Executive Analytics (`/api/admin/analytics`)

All analytics endpoints use Redis caching (5 min TTL) with manual cache-bust invalidation on mutations:
- `GET /api/admin/analytics/overview`: KPI counts (total, completed, pending review, stuck).
- `GET /api/admin/analytics/requests-trend?range=30d`: Daily/weekly volume time series.
- `GET /api/admin/analytics/turnaround`: Average duration from submission to final issuance.
- `GET /api/admin/analytics/team-leaders`: Performance breakdown per TL (throughput, approval rate).
- `GET /api/admin/analytics/stuck-requests`: Requests pending > 5 days.
- `GET /api/admin/analytics/export?format=csv|xlsx`: File export of current filtered metrics.

---

## 7. Public Verification (`/api/verify`)

### `GET /api/verify/:verifyId`
Publicly verifies credential validity without requiring authentication or cookies.
- **Allowed Roles:** Public
- **Response `200 OK` (Valid Certificate)**:
```json
{
  "certificateNumber": "UTS-2026-001234",
  "recipientName": "Jane Doe",
  "certificateTitle": "Internship Completion Certificate",
  "domain": "Web Development",
  "issuedAt": "2026-10-15T10:30:00.000Z",
  "status": "valid"
}
```
- **Response `200 OK` (Revoked Certificate)**:
```json
{
  "certificateNumber": "UTS-2026-001234",
  "recipientName": "Jane Doe",
  "certificateTitle": "Internship Completion Certificate",
  "domain": "Web Development",
  "issuedAt": "2026-10-15T10:30:00.000Z",
  "status": "revoked",
  "revokedAt": "2026-11-01T14:20:00.000Z"
}
```
- **Response `404 Not Found`**:
```json
{ "message": "Certificate not found" }
```
*(No sensitive data such as email, phone number, intern code, or MongoDB ID is ever returned).*

