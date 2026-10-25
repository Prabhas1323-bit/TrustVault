import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDocumentAuthorization,
  validateUploadFile,
  sanitizeFilename,
  AuthContextUser
} from '../src/utils/authorization.ts';
import { DocumentRecord, PermissionRecord } from '../src/types/index.ts';

const mockDoc: DocumentRecord = {
  id: 'doc-101',
  title: 'Q3 Financial Audit',
  originalFilename: 'audit.pdf',
  storedFilename: 'stored_uuid_101.pdf',
  fileSize: 1024 * 50,
  mimeType: 'application/pdf',
  category: 'Finance',
  description: 'Confidential corporate audit',
  ownerId: 'owner-alice',
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z'
};

const ownerAlice: AuthContextUser = {
  id: 'owner-alice',
  role: 'owner',
  isActive: true
};

const ownerBob: AuthContextUser = {
  id: 'owner-bob',
  role: 'owner',
  isActive: true
};

const viewerCharlie: AuthContextUser = {
  id: 'viewer-charlie',
  role: 'viewer',
  isActive: true
};

const adminDave: AuthContextUser = {
  id: 'admin-dave',
  role: 'admin',
  isActive: true
};

const deactivatedAlice: AuthContextUser = {
  id: 'owner-alice',
  role: 'owner',
  isActive: false
};

test('1. Unauthenticated requests are strictly denied', () => {
  const res = checkDocumentAuthorization(null, mockDoc, 'VIEW', []);
  assert.equal(res.allowed, false);
  assert.match(res.reason || '', /Authentication required/i);
});

test('2. Deactivated accounts cannot perform any action even on their own documents', () => {
  const res = checkDocumentAuthorization(deactivatedAlice, mockDoc, 'VIEW', []);
  assert.equal(res.allowed, false);
  assert.match(res.reason || '', /deactivated/i);
});

test('3. Document Owner has full access: VIEW, DOWNLOAD, EDIT, DELETE, SHARE, REVOKE', () => {
  assert.equal(checkDocumentAuthorization(ownerAlice, mockDoc, 'VIEW', []).allowed, true);
  assert.equal(checkDocumentAuthorization(ownerAlice, mockDoc, 'DOWNLOAD', []).allowed, true);
  assert.equal(checkDocumentAuthorization(ownerAlice, mockDoc, 'EDIT', []).allowed, true);
  assert.equal(checkDocumentAuthorization(ownerAlice, mockDoc, 'DELETE', []).allowed, true);
  assert.equal(checkDocumentAuthorization(ownerAlice, mockDoc, 'SHARE', []).allowed, true);
  assert.equal(checkDocumentAuthorization(ownerAlice, mockDoc, 'REVOKE', []).allowed, true);
});

test('4. Horizontal privilege escalation prevented: Owner Bob cannot access Owner Alice document without permission', () => {
  assert.equal(checkDocumentAuthorization(ownerBob, mockDoc, 'VIEW', []).allowed, false);
  assert.equal(checkDocumentAuthorization(ownerBob, mockDoc, 'EDIT', []).allowed, false);
  assert.equal(checkDocumentAuthorization(ownerBob, mockDoc, 'DELETE', []).allowed, false);
  assert.equal(checkDocumentAuthorization(ownerBob, mockDoc, 'SHARE', []).allowed, false);
});

test('5. Viewer with VIEW grant can view and download, but cannot EDIT, DELETE, SHARE, or REVOKE', () => {
  const grants: PermissionRecord[] = [
    {
      id: 'grant-1',
      documentId: 'doc-101',
      userId: 'viewer-charlie',
      userEmail: 'charlie@trustvault.io',
      userName: 'Charlie',
      permissionLevel: 'VIEW',
      grantedById: 'owner-alice',
      grantedByEmail: 'alice@trustvault.io',
      grantedAt: '2026-10-21T12:00:00Z'
    }
  ];

  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'VIEW', grants).allowed, true);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'DOWNLOAD', grants).allowed, true);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'EDIT', grants).allowed, false);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'DELETE', grants).allowed, false);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'SHARE', grants).allowed, false);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'REVOKE', grants).allowed, false);
});

test('6. Viewer with EDIT grant can edit metadata, but cannot DELETE or SHARE', () => {
  const grants: PermissionRecord[] = [
    {
      id: 'grant-2',
      documentId: 'doc-101',
      userId: 'viewer-charlie',
      userEmail: 'charlie@trustvault.io',
      userName: 'Charlie',
      permissionLevel: 'EDIT',
      grantedById: 'owner-alice',
      grantedByEmail: 'alice@trustvault.io',
      grantedAt: '2026-10-21T12:00:00Z'
    }
  ];

  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'VIEW', grants).allowed, true);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'DOWNLOAD', grants).allowed, true);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'EDIT', grants).allowed, true);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'DELETE', grants).allowed, false);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'SHARE', grants).allowed, false);
});

test('7. Revocation takes effect immediately: once grant is absent, access is denied', () => {
  // Empty grants simulating post-revocation state
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'VIEW', []).allowed, false);
  assert.equal(checkDocumentAuthorization(viewerCharlie, mockDoc, 'DOWNLOAD', []).allowed, false);
});

test('8. Admin policy permits read-only audit inspection, but blocks unauthorized deletion or sharing', () => {
  assert.equal(checkDocumentAuthorization(adminDave, mockDoc, 'VIEW', []).allowed, true);
  assert.equal(checkDocumentAuthorization(adminDave, mockDoc, 'DOWNLOAD', []).allowed, true);
  assert.equal(checkDocumentAuthorization(adminDave, mockDoc, 'DELETE', []).allowed, false);
  assert.equal(checkDocumentAuthorization(adminDave, mockDoc, 'SHARE', []).allowed, false);
});

test('9. Upload validation rejects oversized files and dangerous executable formats', () => {
  const valid = validateUploadFile('report.pdf', 'application/pdf', 1024 * 1024);
  assert.equal(valid.valid, true);

  const oversized = validateUploadFile('huge.pdf', 'application/pdf', 15 * 1024 * 1024);
  assert.equal(oversized.valid, false);
  assert.match(oversized.error || '', /exceeds maximum limit/i);

  const malicious = validateUploadFile('malware.exe', 'application/x-msdownload', 1024);
  assert.equal(malicious.valid, false);

  const shellScript = validateUploadFile('exploit.sh', 'text/x-shellscript', 512);
  assert.equal(shellScript.valid, false);
});

test('10. Filename sanitization prevents path traversal and dangerous characters', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), 'etc_passwd');
  assert.equal(sanitizeFilename('..\\..\\windows\\system32'), 'windows_system32');
  assert.equal(sanitizeFilename('my document (1).pdf'), 'my document (1).pdf');
});
