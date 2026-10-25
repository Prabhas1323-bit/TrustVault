# TrustVault — Secure Document Management & Access Control Platform

TrustVault is a zero-trust enterprise document vault and access control system. Built with **React 19 + Vite** on the frontend, a dual **Node.js Express / Python Flask** backend architecture, and a centralized server-side authorization engine, TrustVault enforces granular access policies, immediate permission revocation, and immutable security audit trails.

---

## 1. Key Architectural Features

- **Centralized Zero-Trust Authorization**: Strict server-side policy engine (`authorization.py` / `authorization.ts`). All document requests enforce authentication, active account verification, ownership, and per-document grants. Default is **DENY**.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: System-wide oversight, user status toggles (activate/deactivate), security audit inspection. (Provisioned via protected CLI tool only; no public self-promotion).
  - **Owner**: Upload, download, edit metadata, delete, and delegate per-document permissions (`VIEW` or `EDIT`) to collaborators.
  - **Viewer**: Read-only authorized access to shared documents. Strictly prohibited from uploading, modifying metadata, deleting files, or granting permissions.
- **Immediate Revocation**: Revoking a collaborator's access invalidates downloads immediately. No public or pre-signed URLs bypass server checks.
- **Path Traversal & Upload Security**: Strict 10MB limit, safe format allowlist (`.pdf`, `.docx`, `.xlsx`, `.txt`, `.csv`, `.md`, `.png`, `.jpg`), path-traversal sanitization, and random UUID storage prefixes in a private folder outside the web root.
- **Immutable Security Audit Trail**: Logs logins, uploads, downloads, deletions, metadata edits, permission grants/revocations, and denied access attempts with timestamps, actor IDs, client IP, and outcomes. Passwords and file payloads are never logged.
- **Premium Glass-White Aesthetic**: Warm white (`#F7F8F5`), translucent frosted glass panels, subtle borders, and emerald green (`#087F5B`) accents with **Inter** and **Sora** typography.
- **1-Click Evaluation Persona Switcher**: Test any security persona (`Admin`, `Owner Alice`, `Owner Bob`, `Viewer Charlie`) directly from the top navigation or login modal.

---

## 2. Technology Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS, Lucide React, TypeScript.
- **Full-Stack Runtime**: Express server with Vite middlewares (`server.ts`) for unified zero-trust API and React hosting on port 3000.
- **Python Backend**: Python Flask 3.1, Flask-SQLAlchemy 3.1, Werkzeug, Argon2, Pytest 9.
- **Storage**: Private filesystem vault (`storage/vault_files/`) with path traversal protections.
- **Database**: SQLite (development/testing) / PostgreSQL (production).

---

## 3. Quick Start & Local Development

### Option A: Complete Web Applet (Vite + Express Full-Stack)

The dev server runs the unified zero-trust server and React frontend simultaneously on port 3000.

#### On Linux / macOS:
```bash
# 1. Install dependencies
npm install

# 2. Run unit logic tests
npm run test

# 3. Start full-stack dev server (port 3000)
npm run dev
```

#### On Windows PowerShell:
```powershell
# 1. Install dependencies
npm install

# 2. Run unit logic tests
npm run test

# 3. Start full-stack dev server (port 3000)
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

### Option B: Standalone Python Flask Backend & Pytest Suite

TrustVault includes a standalone Flask backend in `/backend`.

#### On Linux / macOS:
```bash
# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Run the automated 20-test security suite
PYTHONPATH=. pytest backend/tests/test_security.py -v

# 4. Provision a new administrator securely via CLI
python3 -m backend.cli create-admin --email admin@trustvault.io --password "TrustVault2026!Admin"

# 5. Start Flask development server
python3 backend/app.py
```

#### On Windows PowerShell:
```powershell
# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Run the automated 20-test security suite
$env:PYTHONPATH="."
pytest backend/tests/test_security.py -v

# 4. Provision a new administrator securely via CLI
python -m backend.cli create-admin --email admin@trustvault.io --password "TrustVault2026!Admin"

# 5. Start Flask development server
python backend/app.py
```

---

## 4. Evaluation Credentials (Pre-Seeded)

For testing and assessment, TrustVault includes pre-seeded accounts:

| Role | Account Name | Email | Password | Scope & Responsibilities |
|:---|:---|:---|:---|:---|
| **Admin** | Chief Security Officer | `admin@trustvault.io` | `TrustVault2026!Admin` | Full audit oversight; user activation/deactivation. |
| **Owner** | Alice Henderson (Legal) | `alice@trustvault.io` | `AlicePass2026!` | Owns M&A NDA & SOC2 report; manages collaborator sharing. |
| **Owner** | Bob Martinez (Finance) | `bob@trustvault.io` | `BobPass2026!` | Owns Financial ledger; has `EDIT` grant on Alice's M&A NDA. |
| **Viewer** | Charlie Wu (Auditor) | `charlie@trustvault.io` | `CharliePass2026!` | `VIEW`-only grant on shared NDA and ledger; cannot upload or delete. |

*You can switch between these accounts instantly using the **Role Switcher** in the top navigation bar.*

---

## 5. Automated Security Test Results

All 20 mandatory security test scenarios are verified:

```
backend/tests/test_security.py::test_1_unauthenticated_requests_denied PASSED
backend/tests/test_security.py::test_2_owner_a_can_manage_own_doc PASSED
backend/tests/test_security.py::test_3_owner_a_cannot_manage_owner_b_doc PASSED
backend/tests/test_security.py::test_4_viewer_cannot_upload_or_delete PASSED
backend/tests/test_security.py::test_5_viewer_cannot_grant_or_revoke PASSED
backend/tests/test_security.py::test_6_viewer_cannot_change_ownership PASSED
backend/tests/test_security.py::test_7_viewer_cannot_access_admin PASSED
backend/tests/test_security.py::test_8_no_admin_self_promotion PASSED
backend/tests/test_security.py::test_9_authorized_viewer_can_download PASSED
backend/tests/test_security.py::test_10_unapproved_user_cannot_download PASSED
backend/tests/test_security.py::test_11_revocation_blocks_subsequent_downloads PASSED
backend/tests/test_security.py::test_12_inactive_user_cannot_access PASSED
backend/tests/test_security.py::test_13_invalid_and_oversized_uploads_rejected PASSED
backend/tests/test_security.py::test_14_path_traversal_sanitized PASSED
backend/tests/test_security.py::test_15_unauthorized_audit_log_access PASSED
backend/tests/test_security.py::test_16_denied_operation_state_integrity PASSED
backend/tests/test_security.py::test_17_invalid_login_records_audit PASSED
backend/tests/test_security.py::test_18_unauthorized_metadata_edits_fail PASSED
backend/tests/test_security.py::test_19_list_does_not_expose_unauthorized_docs PASSED
backend/tests/test_security.py::test_20_password_update_requires_current_password PASSED

20 passed in 17.60s
```

---

## 6. Known Limitations

- **Binary Malware Scanning**: File type validation enforces strict allowlists and extension checks. For enterprise production, integrate a ClamAV daemon socket or Google Cloud Virus Scanning API.
- **WORM Audit Storage**: Local database audit records are protected against application modification (append-only); full regulatory compliance (e.g. SEC Rule 17a-4) requires forwarding audit logs to an external write-once-read-many SIEM or cloud logging sink.
