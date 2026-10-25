# TrustVault — Security Architecture & Policy Specification

This document details the security principles, cryptographic mechanisms, authorization policies, session controls, and operational considerations implemented in **TrustVault**.

---

## 1. Authentication Architecture

### 1.1 Password Storage & Cryptographic Hashing
- **Hashing Algorithm**: PBKDF2 with SHA-256 (100,000 iterations) with a unique, cryptographically random 16-byte salt per user generated via `crypto.randomBytes(16)` / `werkzeug.security.generate_password_hash`.
- **Argon2id Compatibility**: Backend supports Argon2id password hashing via `argon2-cffi` for enterprise production deployments.
- **Plaintext Prohibition**: Plaintext passwords and intermediate credential tokens are never written to disk, stored in databases, or logged to application output.

### 1.2 Session Management & Token Rotation
- **Session Tokens**: Cryptographically strong random identifiers or server-managed tokens passed via `Authorization: Bearer <token>` or `HttpOnly`, `SameSite=Lax` cookies.
- **Session Invalidation**: Calling `/api/auth/logout` terminates the session immediately.
- **Account Deactivation Enforcement**: Every protected endpoint evaluates `user.is_active` on every request. Deactivated accounts are rejected with `HTTP 401 Unauthorized` or `HTTP 403 Forbidden` regardless of whether they hold a valid token.

---

## 2. Global Roles vs. Per-Document Permissions

TrustVault strictly separates **Global Roles** (administrative capabilities and default upload rights) from **Per-Document Permissions** (granular delegation on specific files).

### 2.1 Global Roles

| Role | Default Permissions | Description |
|:---|:---|:---|
| **Admin** | Read-only audit access to all documents; user management; system-wide audit trail. | Provisioned exclusively via protected CLI command (`python -m backend.cli create-admin`). Cannot be selected during public registration. |
| **Owner** | Upload documents; view, download, edit, and delete owned documents; grant and revoke sharing permissions to collaborators. | Standard role assigned to newly registered users. |
| **Viewer** | View and download documents explicitly shared with them. Cannot upload files, delete documents, or manage permissions. | Restricted stakeholder role (e.g. external auditors, clients). |

### 2.2 Per-Document Permission Levels

When a Document Owner shares a document with a collaborator, they assign one of two permission levels:

1. **VIEW**:
   - Authorized to view document metadata (`title`, `category`, `size`, `upload date`).
   - Authorized to download the encrypted file payload.
   - **Prohibited**: Modifying metadata, deleting the file, granting permissions to others, revoking permissions.

2. **EDIT**:
   - Authorized to view metadata and download the file.
   - Authorized to edit title, category, and description.
   - **Prohibited**: Deleting the file, granting permissions to third parties, revoking permissions, changing file ownership.

---

## 3. Centralized Authorization Engine (Zero-Trust Decision Tree)

Every protected document endpoint routes through `authorize_document_access()` in `authorization.py` / `authorization.ts`:

```
                      [ Incoming Request ]
                               │
               Is user authenticated?
               ├── No  ──► [ 401 Unauthorized ]
               └── Yes
                        │
               Is account active (user.isActive)?
               ├── No  ──► [ 403 Account Deactivated ]
               └── Yes
                        │
               Does document exist?
               ├── No  ──► [ 404 / 403 Not Found ]
               └── Yes
                        │
               Is user the Document Owner?
               ├── Yes ──► [ ALLOW ALL: View, Download, Edit, Delete, Share, Revoke ]
               └── No
                        │
               Does user have an active Permission record?
               ├── No
               │    ├── Is user an Admin?
               │    │    ├── Action in (VIEW, DOWNLOAD) ──► [ ALLOW Audit Access ]
               │    │    └── Action in (DELETE, SHARE)  ──► [ DENY: 403 Forbidden ]
               │    └── User is not Admin ───────────────► [ DENY: 403 Forbidden ]
               │
               └── Yes (Active Grant exists)
                    ├── Action in (VIEW, DOWNLOAD) ───────► [ ALLOW ]
                    ├── Action is EDIT
                    │    ├── Grant level is EDIT ─────────► [ ALLOW ]
                    │    └── Grant level is VIEW ─────────► [ DENY: 403 Forbidden ]
                    └── Action in (DELETE, SHARE, REVOKE) ─► [ DENY: 403 Forbidden ]
```

### Key Security Invariants:
- **Default Deny**: Any action not explicitly matched is denied.
- **Immediate Revocation**: Deleting a permission row from the database invalidates access immediately on the next byte request. No cached URLs or public links exist.
- **Horizontal Isolation**: Owner A cannot read, edit, or delete Owner B's document without an explicit grant.

---

## 4. File Upload & Storage Defenses

1. **Private Storage Location**:
   - Files are stored in `./storage/vault_files/`, located strictly outside the public web root (`./dist` or `./public`).
   - The web server never serves files directly via static directory indexing.

2. **Path Traversal Sanitization**:
   - Submitted filenames are sanitized using directory traversal stripping (`re.sub(r'(\.\.[/\\])+', '', filename)`), null-byte stripping, and character replacement.
   - Files are stored with random UUID prefixes (`uuid.uuid4().hex_originalFilename`) to prevent collision attacks, directory escalation, and overwriting existing files.

3. **Size Limit Enforcement**:
   - Enforced at 10 MB (`10 * 1024 * 1024` bytes) both on the multipart body parser and during disk write.

4. **Extension & MIME Allowlist**:
   - Allowed: `.pdf`, `.docx`, `.doc`, `.xlsx`, `.txt`, `.csv`, `.md`, `.png`, `.jpg`, `.jpeg`.
   - Dangerous executables (`.exe`, `.sh`, `.bat`, `.cmd`, `.py`, `.js`, `.php`, `.vbs`) are rejected with `HTTP 400 Bad Request`.

5. **Safe File Cleanup on Deletion**:
   - When a document is deleted by its owner, the physical file on disk is unlinked before the database record is removed.

---

## 5. Security Audit Logging

All security-sensitive operations trigger an append-only audit record:
- **Logged Events**: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `DOCUMENT_UPLOAD`, `DOCUMENT_DOWNLOAD`, `DOCUMENT_DELETE`, `METADATA_UPDATE`, `PERMISSION_GRANT`, `PERMISSION_REVOKE`, `AUTHORIZATION_DENIED`, `USER_STATUS_CHANGE`, `ADMIN_PROVISION`.
- **Recorded Fields**: Timestamp (UTC), Actor ID, Actor Email, Action, Resource Type, Resource ID, Outcome Status (`SUCCESS`, `DENIED`, `FAILED`), Client IP Address, User Agent, Context Details.
- **Data Sanitization**: Passwords, encryption keys, authorization tokens, and raw document contents are never logged.

---

## 6. Production Hardening Checklist

When transitioning from development to production:
1. **Database**: Migrate from SQLite to PostgreSQL with SSL connections enabled (`sslmode=require`).
2. **Reverse Proxy & HTTPS**: Deploy behind Nginx or Cloudflare with TLS 1.3, HSTS (`Strict-Transport-Security`), and CSP (`Content-Security-Policy`).
3. **Session Cookies**: Set `SESSION_COOKIE_SECURE = True`, `SESSION_COOKIE_HTTPONLY = True`, and `SESSION_COOKIE_SAMESITE = 'Strict'`.
4. **Malware Scanning**: Connect file uploads to ClamAV daemon via socket inspection before committing to storage.
5. **SIEM Integration**: Forward audit logs via syslog or JSON stream to an external SIEM (e.g. Datadog, Splunk, Google Cloud Logging).
