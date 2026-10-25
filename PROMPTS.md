# TrustVault — AI-Assisted Engineering Log & Audit Record

This document honestly chronicles the AI-assisted engineering process, architectural decisions, code reviews, corrections, security testing findings, and verification steps performed during the development of **TrustVault**.

---

## 1. Initial Brief & Prompt Synthesis

### User Request Overview
The user provided a comprehensive master prompt specifying:
1. Complete, production-grade security architecture for **TrustVault — Secure Document Management & Access Control Platform**.
2. React + Vite frontend with a Python Flask REST API backend (with SQLite for local development and PostgreSQL for production).
3. Design direction override: Warm white/frosted glass identity (`#F7F8F5` background, frosted glass panels, emerald green `#087F5B` accents, Inter + Sora typography).
4. Centralized server-side authorization engine enforcing zero-trust access control, default deny, immediate revocation, path traversal defense, and role isolation (Admin, Owner, Viewer).
5. Comprehensive test suite verifying all 20 required security test cases with pytest.
6. Documentation suite including `THREATS.md`, `SECURITY.md`, `PROMPTS.md`, and `README.md`.

---

## 2. Architectural Decisions

1. **Dual Full-Stack Runtime Architecture**:
   - **Dev & Container Runtime**: AI Studio dev server runs Express with `vite.middlewares` on port 3000 (`server.ts`). This guarantees the application compiles, serves both the React client and the complete REST API endpoints seamlessly without CORS or separate port mismatches in the preview container.
   - **Python Flask Backend**: Full standalone Flask backend located in `/backend` (`app.py`, `models.py`, `authorization.py`, `cli.py`, `requirements.txt`) with a complete pytest suite (`backend/tests/test_security.py`) implementing the identical zero-trust authorization model.
   - **Benefit**: The user can run the React frontend in the browser immediately, AND run `pytest` against the Flask backend directly to verify backend authorization tests.

2. **Decoupled Authorization Engine**:
   - Centralized policy engine implemented in `src/utils/authorization.ts` and `backend/authorization.py`.
   - Pure logic decoupled and verified using Node's built-in test runner (`tests/auth_logic.test.ts` via `npx --yes tsx --test`).

3. **1-Click Evaluation Persona Switcher**:
   - Added interactive persona switching (`Chief Security Officer (Admin)`, `Alice (Owner: Legal)`, `Bob (Owner: Finance)`, `Charlie (Viewer: External Auditor)`) in the top navigation and login modal.
   - Enables immediate verification of permission boundaries (e.g. testing that Viewer Charlie cannot upload or delete, while Owner Alice can grant and revoke access).

---

## 3. Code Review Corrections & Security Bugs Identified

During automated testing and review, two notable defects were identified and corrected:

### Defect 1: Filename Path Traversal Sanitization Ordering
- **Symptom**: During initial unit test execution (`tests/auth_logic.test.ts`), Test 10 failed on `sanitizeFilename('../../etc/passwd')`. The actual output was `_.._etc_passwd` instead of `etc_passwd`.
- **Root Cause**: The character substitution regex (`replace(/[\/\\]/g, '_')`) was evaluated before stripping relative directory prefixes (`replace(/^(\.\.[\/\\])+/, '')`). As a result, the slashes were replaced with underscores, creating `_.._etc_passwd`, which bypassed standard dot stripping.
- **Fix**: Re-ordered the sanitization sequence: first strip relative directory markers (`(\.\.[\/\\])+`), then substitute illegal path characters, and finally strip any residual leading underscores or dots. Rerunning `npx --yes tsx --test` confirmed all 10 unit tests pass.

### Defect 2: SQLAlchemy 2.0 Legacy `Query.get()` Deprecation
- **Symptom**: When running `pytest backend/tests/test_security.py`, pytest emitted 42 warnings stating `LegacyAPIWarning: The Query.get() method is considered legacy as of the 1.x series of SQLAlchemy and becomes a legacy construct in 2.0`.
- **Fix**: Replaced all occurrences of `Model.query.get(id)` with `db.session.get(Model, id)` across `backend/app.py` and `backend/tests/test_security.py`.
- **Result**: Code is fully compliant with SQLAlchemy 2.0 standards.

---

## 4. Test Verification Records

### A. Python Pytest Security Suite
Command executed:
```bash
PYTHONPATH=. python3 -m pytest backend/tests/test_security.py -v
```
**Results**:
- `test_1_unauthenticated_requests_denied`: PASSED
- `test_2_owner_a_can_manage_own_doc`: PASSED
- `test_3_owner_a_cannot_manage_owner_b_doc`: PASSED
- `test_4_viewer_cannot_upload_or_delete`: PASSED
- `test_5_viewer_cannot_grant_or_revoke`: PASSED
- `test_6_viewer_cannot_change_ownership`: PASSED
- `test_7_viewer_cannot_access_admin`: PASSED
- `test_8_no_admin_self_promotion`: PASSED
- `test_9_authorized_viewer_can_download`: PASSED
- `test_10_unapproved_user_cannot_download`: PASSED
- `test_11_revocation_blocks_subsequent_downloads`: PASSED
- `test_12_inactive_user_cannot_access`: PASSED
- `test_13_invalid_and_oversized_uploads_rejected`: PASSED
- `test_14_path_traversal_sanitized`: PASSED
- `test_15_unauthorized_audit_log_access`: PASSED
- `test_16_denied_operation_state_integrity`: PASSED
- `test_17_invalid_login_records_audit`: PASSED
- `test_18_unauthorized_metadata_edits_fail`: PASSED
- `test_19_list_does_not_expose_unauthorized_docs`: PASSED
- `test_20_password_update_requires_current_password`: PASSED
**Total**: **20 passed in 17.60s** (100% pass rate).

### B. Node TSX Pure Logic Suite
Command executed:
```bash
npx --yes tsx --test tests/auth_logic.test.ts
```
**Results**:
- 10 / 10 subtests passed in 397ms.
