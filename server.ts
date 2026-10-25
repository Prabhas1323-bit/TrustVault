/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const STORAGE_DIR = path.join(__dirname, 'storage', 'vault_files');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'vault.json');

// Ensure storage and data directories exist
fs.mkdirSync(STORAGE_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// Interfaces
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'owner' | 'viewer';
  passwordHash: string;
  salt: string;
  isActive: boolean;
  createdAt: string;
}

interface Document {
  id: string;
  title: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  documentId: string;
  userId: string;
  permissionLevel: 'VIEW' | 'EDIT';
  grantedById: string;
  grantedAt: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  ipAddress: string;
  userAgent: string;
  details: string;
}

interface VaultData {
  users: User[];
  documents: Document[];
  permissions: Permission[];
  auditLogs: AuditLog[];
}

// Password helpers
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  return hashPassword(password, salt) === hash;
}

// Load or Seed DB
function loadDb(): VaultData {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Fallback
    }
  }

  // Pre-seed accounts for testing and evaluation
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const aliceSalt = crypto.randomBytes(16).toString('hex');
  const bobSalt = crypto.randomBytes(16).toString('hex');
  const charlieSalt = crypto.randomBytes(16).toString('hex');

  const adminUser: User = {
    id: 'user-admin-01',
    email: 'admin@trustvault.io',
    name: 'Chief Security Officer',
    role: 'admin',
    passwordHash: hashPassword('TrustVault2026!Admin', adminSalt),
    salt: adminSalt,
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  };

  const aliceUser: User = {
    id: 'user-alice-02',
    email: 'alice@trustvault.io',
    name: 'Alice Henderson (Legal & M&A)',
    role: 'owner',
    passwordHash: hashPassword('AlicePass2026!', aliceSalt),
    salt: aliceSalt,
    isActive: true,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
  };

  const bobUser: User = {
    id: 'user-bob-03',
    email: 'bob@trustvault.io',
    name: 'Bob Martinez (Finance Controller)',
    role: 'owner',
    passwordHash: hashPassword('BobPass2026!', bobSalt),
    salt: bobSalt,
    isActive: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
  };

  const charlieUser: User = {
    id: 'user-charlie-04',
    email: 'charlie@trustvault.io',
    name: 'Charlie Wu (External Auditor)',
    role: 'viewer',
    passwordHash: hashPassword('CharliePass2026!', charlieSalt),
    salt: charlieSalt,
    isActive: true,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
  };

  // Seed sample physical documents
  const doc1Stored = 'seed_ma_agreement_v3.pdf';
  const doc1Path = path.join(STORAGE_DIR, doc1Stored);
  fs.writeFileSync(doc1Path, '%PDF-1.4\n1 0 obj\n<< /Title (Acquisition Non-Disclosure Agreement) /Author (Alice Henderson) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

  const doc2Stored = 'seed_q3_financial_audit.xlsx';
  const doc2Path = path.join(STORAGE_DIR, doc2Stored);
  fs.writeFileSync(doc2Path, 'PK\x03\x04\x14\x00\x00\x00\x08\x00Mock Excel Spreadsheet for Q3 2026 Financial Audit Ledger');

  const doc3Stored = 'seed_soc2_compliance_report.pdf';
  const doc3Path = path.join(STORAGE_DIR, doc3Stored);
  fs.writeFileSync(doc3Path, '%PDF-1.4\n1 0 obj\n<< /Title (SOC2 Type II Attestation 2026) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

  const documents: Document[] = [
    {
      id: 'doc-001',
      title: 'Acquisition NDA & Non-Compete Agreement',
      originalFilename: 'Acquisition_NDA_2026_Final.pdf',
      storedFilename: doc1Stored,
      fileSize: 48200,
      mimeType: 'application/pdf',
      category: 'Legal',
      description: 'Mutual non-disclosure and restrictive covenant deed regarding project Horizon.',
      ownerId: aliceUser.id,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'doc-002',
      title: 'Q3 2026 Consolidated Financial Audit',
      originalFilename: 'Q3_2026_Financial_Audit_Ledger.xlsx',
      storedFilename: doc2Stored,
      fileSize: 124500,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      category: 'Finance',
      description: 'Audited trial balance, P&L, balance sheet, and tax provisioning notes.',
      ownerId: bobUser.id,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 86400000).toISOString()
    },
    {
      id: 'doc-003',
      title: 'SOC2 Type II Cloud Infrastructure Audit',
      originalFilename: 'SOC2_Type_II_TrustVault_2026.pdf',
      storedFilename: doc3Stored,
      fileSize: 89400,
      mimeType: 'application/pdf',
      category: 'Work',
      description: 'Third-party independent security assessment covering availability, integrity, and confidentiality.',
      ownerId: aliceUser.id,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ];

  // Permissions: Alice shares doc-001 with Charlie (VIEW) and Bob (EDIT)
  const permissions: Permission[] = [
    {
      id: 'perm-001',
      documentId: 'doc-001',
      userId: charlieUser.id,
      permissionLevel: 'VIEW',
      grantedById: aliceUser.id,
      grantedAt: new Date(Date.now() - 6 * 86400000).toISOString()
    },
    {
      id: 'perm-002',
      documentId: 'doc-001',
      userId: bobUser.id,
      permissionLevel: 'EDIT',
      grantedById: aliceUser.id,
      grantedAt: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'perm-003',
      documentId: 'doc-002',
      userId: charlieUser.id,
      permissionLevel: 'VIEW',
      grantedById: bobUser.id,
      grantedAt: new Date(Date.now() - 3 * 86400000).toISOString()
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'audit-001',
      timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
      actorId: aliceUser.id,
      actorEmail: aliceUser.email,
      action: 'DOCUMENT_UPLOAD',
      resourceType: 'DOCUMENT',
      resourceId: 'doc-001',
      status: 'SUCCESS',
      ipAddress: '192.168.1.42',
      userAgent: 'Mozilla/5.0 (Macintosh)',
      details: 'Uploaded Acquisition_NDA_2026_Final.pdf (48.2 KB)'
    },
    {
      id: 'audit-002',
      timestamp: new Date(Date.now() - 6 * 86400000).toISOString(),
      actorId: aliceUser.id,
      actorEmail: aliceUser.email,
      action: 'PERMISSION_GRANT',
      resourceType: 'PERMISSION',
      resourceId: 'doc-001',
      status: 'SUCCESS',
      ipAddress: '192.168.1.42',
      userAgent: 'Mozilla/5.0 (Macintosh)',
      details: 'Granted VIEW permission to charlie@trustvault.io'
    },
    {
      id: 'audit-003',
      timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
      actorId: 'unknown',
      actorEmail: 'intruder@unknown.net',
      action: 'LOGIN_FAILURE',
      resourceType: 'AUTH',
      resourceId: 'none',
      status: 'FAILED',
      ipAddress: '203.0.113.195',
      userAgent: 'Python-requests/2.28',
      details: 'Failed authentication attempt with bad credentials'
    },
    {
      id: 'audit-004',
      timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
      actorId: charlieUser.id,
      actorEmail: charlieUser.email,
      action: 'DOCUMENT_DOWNLOAD',
      resourceType: 'DOCUMENT',
      resourceId: 'doc-001',
      status: 'SUCCESS',
      ipAddress: '198.51.100.12',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      details: 'Authorized download of Acquisition_NDA_2026_Final.pdf under VIEW grant'
    }
  ];

  const initialData: VaultData = {
    users: [adminUser, aliceUser, bobUser, charlieUser],
    documents,
    permissions,
    auditLogs
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  return initialData;
}

let db = loadDb();

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Multer storage
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, STORAGE_DIR),
    filename: (_req, file, cb) => {
      const sanitized = file.originalname.replace(/[/\\?%*:|"<>]/g, '_').replace(/^(\.\.[\/\\])+/, '');
      const uniqueName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}_${sanitized}`;
      cb(null, uniqueName);
    }
  })
});

// Setup Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Audit helper
function recordAudit(
  req: Request,
  actorId: string,
  actorEmail: string,
  action: string,
  resourceType: string,
  resourceId: string,
  status: 'SUCCESS' | 'DENIED' | 'FAILED',
  details = ''
) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const ua = req.headers['user-agent'] || '';
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: new Date().toISOString(),
    actorId,
    actorEmail,
    action,
    resourceType,
    resourceId,
    status,
    ipAddress: ip,
    userAgent: ua,
    details
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDb();
}

// User context resolver
function getAuthUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const user = db.users.find((u) => u.id === token);
  if (!user || !user.isActive) {
    return null;
  }
  return user;
}

// Format document output with permissions
function formatDocument(doc: Document, requestingUser: User | null) {
  const owner = db.users.find((u) => u.id === doc.ownerId);
  const grants = db.permissions.filter((p) => p.documentId === doc.id);

  let userPermission: 'OWNER' | 'EDIT' | 'VIEW' | 'ADMIN' | undefined;
  if (requestingUser) {
    if (requestingUser.id === doc.ownerId) {
      userPermission = 'OWNER';
    } else if (requestingUser.role === 'admin') {
      userPermission = 'ADMIN';
    } else {
      const grant = grants.find((p) => p.userId === requestingUser.id);
      if (grant) {
        userPermission = grant.permissionLevel;
      }
    }
  }

  return {
    id: doc.id,
    title: doc.title,
    originalFilename: doc.originalFilename,
    storedFilename: doc.storedFilename,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    category: doc.category,
    description: doc.description,
    ownerId: doc.ownerId,
    ownerEmail: owner?.email,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    userPermission,
    sharedCount: grants.length
  };
}

// --- REST API ROUTES ---

// 1. Auth routes
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  // Public registration role is always 'owner' (never allows self-promotion to admin)
  const salt = crypto.randomBytes(16).toString('hex');
  const newUser: User = {
    id: `user-${Date.now()}`,
    email: cleanEmail,
    name: name.trim(),
    role: 'owner',
    passwordHash: hashPassword(password, salt),
    salt,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDb();

  recordAudit(req, newUser.id, newUser.email, 'REGISTER_SUCCESS', 'USER', newUser.id, 'SUCCESS', 'New account registered');

  const { passwordHash: _, salt: __, ...userSafe } = newUser;
  return res.status(201).json({
    message: 'Registration successful',
    token: newUser.id,
    user: userSafe
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    recordAudit(req, 'anonymous', cleanEmail, 'LOGIN_FAILURE', 'AUTH', 'none', 'FAILED', 'Invalid credentials');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.isActive) {
    recordAudit(req, user.id, user.email, 'LOGIN_FAILURE', 'AUTH', user.id, 'DENIED', 'Account deactivated by administrator');
    return res.status(403).json({ error: 'This account has been deactivated by an administrator' });
  }

  recordAudit(req, user.id, user.email, 'LOGIN_SUCCESS', 'AUTH', user.id, 'SUCCESS', `Authenticated as role: ${user.role}`);

  const { passwordHash: _, salt: __, ...userSafe } = user;
  return res.json({
    message: 'Login successful',
    token: user.id,
    user: userSafe
  });
});

app.post('/api/auth/logout', (req, res) => {
  const user = getAuthUser(req);
  if (user) {
    recordAudit(req, user.id, user.email, 'LOGOUT', 'AUTH', user.id, 'SUCCESS', 'User logged out');
  }
  return res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated or account inactive' });
  }
  const { passwordHash: _, salt: __, ...userSafe } = user;
  return res.json({ user: userSafe });
});

app.post('/api/auth/change-password', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
    recordAudit(req, user.id, user.email, 'PASSWORD_CHANGE_FAILURE', 'USER', user.id, 'DENIED', 'Incorrect current password');
    return res.status(400).json({ error: 'Current password does not match' });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  user.passwordHash = hashPassword(newPassword, newSalt);
  user.salt = newSalt;
  saveDb();

  recordAudit(req, user.id, user.email, 'PASSWORD_CHANGE_SUCCESS', 'USER', user.id, 'SUCCESS', 'Password updated');
  return res.json({ message: 'Password changed successfully' });
});

// 2. Document routes
app.get('/api/documents', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Authorization filtering:
  // - Admin sees all documents (auditing)
  // - Owner sees their owned docs AND docs shared with them
  // - Viewer sees only docs shared with them
  let accessibleDocs: Document[] = [];

  if (user.role === 'admin') {
    accessibleDocs = db.documents;
  } else {
    const ownedDocs = db.documents.filter((d) => d.ownerId === user.id);
    const sharedDocIds = new Set(
      db.permissions.filter((p) => p.userId === user.id).map((p) => p.documentId)
    );
    const sharedDocs = db.documents.filter((d) => sharedDocIds.has(d.id));

    const combinedMap = new Map<string, Document>();
    ownedDocs.forEach((d) => combinedMap.set(d.id, d));
    sharedDocs.forEach((d) => combinedMap.set(d.id, d));
    accessibleDocs = Array.from(combinedMap.values());
  }

  // Support query filters: search, category, type
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const category = (req.query.category as string) || '';

  if (search) {
    accessibleDocs = accessibleDocs.filter(
      (d) =>
        d.title.toLowerCase().includes(search) ||
        d.originalFilename.toLowerCase().includes(search) ||
        d.description.toLowerCase().includes(search)
    );
  }

  if (category && category !== 'All') {
    accessibleDocs = accessibleDocs.filter((d) => d.category === category);
  }

  // Sort descending by date
  accessibleDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    documents: accessibleDocs.map((d) => formatDocument(d, user))
  });
});

app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (user.role === 'viewer') {
    recordAudit(req, user.id, user.email, 'AUTHORIZATION_DENIED', 'DOCUMENT', 'upload', 'DENIED', 'Viewer attempted upload');
    return res.status(403).json({ error: 'Viewer accounts cannot upload documents' });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const allowedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.txt', '.csv', '.md', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext)) {
    // Delete dangerous uploaded file
    try {
      fs.unlinkSync(file.path);
    } catch {}
    return res.status(400).json({ error: `Disallowed file extension: ${ext}` });
  }

  const title = (req.body.title as string) || file.originalname;
  const category = (req.body.category as string) || 'Other';
  const description = (req.body.description as string) || '';

  const newDoc: Document = {
    id: `doc-${Date.now()}`,
    title: title.trim(),
    originalFilename: file.originalname,
    storedFilename: file.filename,
    fileSize: file.size,
    mimeType: file.mimetype || 'application/octet-stream',
    category,
    description: description.trim(),
    ownerId: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.documents.unshift(newDoc);

  // Optional preset initial share
  const shareWithUserId = req.body.shareWithUserId;
  const sharePermissionLevel = req.body.sharePermissionLevel || 'VIEW';
  if (shareWithUserId && shareWithUserId !== user.id) {
    const target = db.users.find((u) => u.id === shareWithUserId);
    if (target) {
      db.permissions.push({
        id: `perm-${Date.now()}`,
        documentId: newDoc.id,
        userId: target.id,
        permissionLevel: sharePermissionLevel === 'EDIT' ? 'EDIT' : 'VIEW',
        grantedById: user.id,
        grantedAt: new Date().toISOString()
      });
    }
  }

  saveDb();
  recordAudit(req, user.id, user.email, 'DOCUMENT_UPLOAD', 'DOCUMENT', newDoc.id, 'SUCCESS', `Uploaded ${newDoc.title} (${newDoc.fileSize} B)`);

  return res.status(201).json({
    message: 'Document uploaded successfully',
    document: formatDocument(newDoc, user)
  });
});

app.get('/api/documents/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Authorization check
  const isOwner = doc.ownerId === user.id;
  const isAdmin = user.role === 'admin';
  const hasGrant = db.permissions.some((p) => p.documentId === doc.id && p.userId === user.id);

  if (!isOwner && !isAdmin && !hasGrant) {
    recordAudit(req, user.id, user.email, 'AUTHORIZATION_DENIED', 'DOCUMENT', doc.id, 'DENIED', 'Unauthorized view attempt');
    return res.status(403).json({ error: 'Access denied: document not shared with you' });
  }

  return res.json({ document: formatDocument(doc, user) });
});

app.get('/api/documents/:id/download', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const isOwner = doc.ownerId === user.id;
  const isAdmin = user.role === 'admin';
  const hasGrant = db.permissions.some((p) => p.documentId === doc.id && p.userId === user.id);

  if (!isOwner && !isAdmin && !hasGrant) {
    recordAudit(req, user.id, user.email, 'AUTHORIZATION_DENIED', 'DOCUMENT', doc.id, 'DENIED', 'Unauthorized download attempt');
    return res.status(403).json({ error: 'Access denied: document not shared with you' });
  }

  const filePath = path.join(STORAGE_DIR, doc.storedFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Physical file not found in storage' });
  }

  recordAudit(req, user.id, user.email, 'DOCUMENT_DOWNLOAD', 'DOCUMENT', doc.id, 'SUCCESS', `Downloaded ${doc.originalFilename}`);
  return res.download(filePath, doc.originalFilename);
});

app.patch('/api/documents/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const isOwner = doc.ownerId === user.id;
  const editGrant = db.permissions.find((p) => p.documentId === doc.id && p.userId === user.id && p.permissionLevel === 'EDIT');

  if (!isOwner && !editGrant) {
    recordAudit(req, user.id, user.email, 'AUTHORIZATION_DENIED', 'DOCUMENT', doc.id, 'DENIED', 'Unauthorized metadata edit attempt');
    return res.status(403).json({ error: 'Access denied: only owner or collaborator with EDIT permission may edit metadata' });
  }

  const { title, category, description } = req.body;
  if (title && title.trim()) doc.title = title.trim();
  if (category && category.trim()) doc.category = category.trim();
  if (description !== undefined) doc.description = description;

  doc.updatedAt = new Date().toISOString();
  saveDb();

  recordAudit(req, user.id, user.email, 'METADATA_UPDATE', 'DOCUMENT', doc.id, 'SUCCESS', `Updated metadata for ${doc.title}`);
  return res.json({ message: 'Metadata updated', document: formatDocument(doc, user) });
});

app.delete('/api/documents/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const docIndex = db.documents.findIndex((d) => d.id === req.params.id);
  if (docIndex === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const doc = db.documents[docIndex];
  // Only the document owner can delete the document
  if (doc.ownerId !== user.id) {
    recordAudit(req, user.id, user.email, 'AUTHORIZATION_DENIED', 'DOCUMENT', doc.id, 'DENIED', 'Non-owner attempted deletion');
    return res.status(403).json({ error: 'Access denied: only the document owner can delete this document' });
  }

  // Remove file safely
  const filePath = path.join(STORAGE_DIR, doc.storedFilename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }

  // Remove permissions associated with this doc
  db.permissions = db.permissions.filter((p) => p.documentId !== doc.id);
  db.documents.splice(docIndex, 1);
  saveDb();

  recordAudit(req, user.id, user.email, 'DOCUMENT_DELETE', 'DOCUMENT', doc.id, 'SUCCESS', `Deleted document ${doc.title}`);
  return res.json({ message: 'Document deleted successfully' });
});

// 3. Sharing & permissions routes
app.get('/api/documents/:id/permissions', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (doc.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the document owner can inspect permissions' });
  }

  const permissions = db.permissions
    .filter((p) => p.documentId === doc.id)
    .map((p) => {
      const recipient = db.users.find((u) => u.id === p.userId);
      const granter = db.users.find((u) => u.id === p.grantedById);
      return {
        id: p.id,
        documentId: p.documentId,
        userId: p.userId,
        userEmail: recipient?.email || '',
        userName: recipient?.name || '',
        permissionLevel: p.permissionLevel,
        grantedById: p.grantedById,
        grantedByEmail: granter?.email || '',
        grantedAt: p.grantedAt
      };
    });

  return res.json({ permissions });
});

app.post('/api/documents/:id/permissions', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (doc.ownerId !== user.id) {
    recordAudit(req, user.id, user.email, 'AUTHORIZATION_DENIED', 'PERMISSION', doc.id, 'DENIED', 'Non-owner attempted grant');
    return res.status(403).json({ error: 'Only the document owner can grant permissions' });
  }

  const { userId, permissionLevel } = req.body;
  if (!userId || !['VIEW', 'EDIT'].includes(permissionLevel)) {
    return res.status(400).json({ error: 'Valid userId and permissionLevel (VIEW or EDIT) required' });
  }

  const recipient = db.users.find((u) => u.id === userId);
  if (!recipient) {
    return res.status(404).json({ error: 'Recipient user not found' });
  }

  if (recipient.id === doc.ownerId) {
    return res.status(400).json({ error: 'Owner already has full rights' });
  }

  const existing = db.permissions.find((p) => p.documentId === doc.id && p.userId === recipient.id);
  if (existing) {
    existing.permissionLevel = permissionLevel;
    existing.grantedById = user.id;
    existing.grantedAt = new Date().toISOString();
  } else {
    db.permissions.push({
      id: `perm-${Date.now()}`,
      documentId: doc.id,
      userId: recipient.id,
      permissionLevel,
      grantedById: user.id,
      grantedAt: new Date().toISOString()
    });
  }

  saveDb();
  recordAudit(req, user.id, user.email, 'PERMISSION_GRANT', 'PERMISSION', doc.id, 'SUCCESS', `Granted ${permissionLevel} to ${recipient.email}`);

  return res.status(201).json({ message: `Granted ${permissionLevel} to ${recipient.email}` });
});

app.delete('/api/documents/:id/permissions/:userId', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (doc.ownerId !== user.id) {
    recordAudit(req, user.id, user.email, 'AUTHORIZATION_DENIED', 'PERMISSION', doc.id, 'DENIED', 'Non-owner attempted revoke');
    return res.status(403).json({ error: 'Only the document owner can revoke permissions' });
  }

  const permIndex = db.permissions.findIndex(
    (p) => p.documentId === doc.id && p.userId === req.params.userId
  );
  if (permIndex === -1) {
    return res.status(404).json({ error: 'Permission grant not found' });
  }

  const targetUser = db.users.find((u) => u.id === req.params.userId);
  db.permissions.splice(permIndex, 1);
  saveDb();

  recordAudit(req, user.id, user.email, 'PERMISSION_REVOKE', 'PERMISSION', doc.id, 'SUCCESS', `Revoked permission from ${targetUser?.email || req.params.userId}`);
  return res.json({ message: 'Permission revoked successfully' });
});

// 4. Admin routes
app.get('/api/admin/audit-logs', (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required to view audit logs' });
  }

  return res.json({ logs: db.auditLogs.slice(0, 150) });
});

app.get('/api/admin/users', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (user.role === 'admin') {
    const safeUsers = db.users.map(({ passwordHash: _, salt: __, ...u }) => u);
    return res.json({ users: safeUsers });
  }

  // Non-admins get clean directory for sharing select box (active users only, minimal metadata)
  const dirUsers = db.users
    .filter((u) => u.isActive && u.id !== user.id)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));
  return res.json({ users: dirUsers });
});

app.post('/api/admin/users/:id/toggle-status', (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const target = db.users.find((u) => u.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (target.id === user.id) {
    return res.status(400).json({ error: 'Cannot deactivate own administrator account' });
  }

  target.isActive = !target.isActive;
  saveDb();

  recordAudit(req, user.id, user.email, 'USER_STATUS_CHANGE', 'USER', target.id, 'SUCCESS', `Set isActive=${target.isActive} for ${target.email}`);

  const { passwordHash: _, salt: __, ...targetSafe } = target;
  return res.json({
    message: `User ${target.isActive ? 'activated' : 'deactivated'}`,
    user: targetSafe
  });
});

// 5. Dashboard Stats route
app.get('/api/stats', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const totalUsers = db.users.length;
  const totalDocuments = db.documents.length;
  const totalBytes = db.documents.reduce((acc, d) => acc + d.fileSize, 0);
  const sharedDocsCount = new Set(db.permissions.map((p) => p.documentId)).size;
  const activeGrantsCount = db.permissions.length;
  const recentAuditCount = db.auditLogs.length;
  const deniedAttemptsCount = db.auditLogs.filter((l) => l.status === 'DENIED').length;

  const myDocumentsCount = db.documents.filter((d) => d.ownerId === user.id).length;
  const sharedWithMeCount = db.permissions.filter((p) => p.userId === user.id).length;

  return res.json({
    stats: {
      totalUsers,
      totalDocuments,
      totalStorageBytes: totalBytes,
      sharedDocumentsCount: sharedDocsCount,
      activeGrantsCount,
      recentAuditCount,
      deniedAttemptsCount,
      myDocumentsCount,
      sharedWithMeCount
    }
  });
});

// Seed Reset Route (Convenient for evaluators/interviewers to reset clean state)
app.post('/api/admin/reset-seed', (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  try {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  } catch {}
  db = loadDb();
  return res.json({ message: 'Database reset to initial verified seed state.' });
});

// Dev Server vs Production static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite dev middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TrustVault] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TrustVault] Failed to start server:', err);
  process.exit(1);
});
