/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole, PermissionLevel, DocumentRecord, PermissionRecord } from '../types/index.ts';

export type ActionType = 'VIEW' | 'DOWNLOAD' | 'EDIT' | 'DELETE' | 'SHARE' | 'REVOKE';

export interface AuthContextUser {
  id: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Centralized Zero-Trust Authorization Policy Engine
 *
 * Rules:
 * 1. Default to DENY.
 * 2. Inactive accounts are immediately denied any action.
 * 3. Document owner has full rights: VIEW, DOWNLOAD, EDIT, DELETE, SHARE, REVOKE.
 * 4. Recipient with active EDIT grant can: VIEW, DOWNLOAD, EDIT.
 *    Recipient CANNOT DELETE, SHARE, REVOKE, or change ownership.
 * 5. Recipient with active VIEW grant can: VIEW, DOWNLOAD.
 *    Recipient CANNOT EDIT, DELETE, SHARE, or REVOKE.
 * 6. Admin can VIEW and DOWNLOAD according to administrative oversight policy,
 *    and can access audit logs/user management. Admin CANNOT bypass ownership to delete
 *    or share without explicit owner delegation.
 * 7. Unshared users are strictly denied.
 */
export function checkDocumentAuthorization(
  user: AuthContextUser | null | undefined,
  doc: DocumentRecord | null | undefined,
  action: ActionType,
  activeGrantsForUser: PermissionRecord[] = []
): AuthorizationResult {
  // 1. Default deny
  if (!user) {
    return { allowed: false, reason: 'Authentication required' };
  }

  // 2. Active status check
  if (!user.isActive) {
    return { allowed: false, reason: 'Account is deactivated' };
  }

  if (!doc) {
    return { allowed: false, reason: 'Document not found' };
  }

  // 3. Document Owner Check
  const isOwner = user.id === doc.ownerId;
  if (isOwner) {
    return { allowed: true };
  }

  // 4. Per-document active permission grant lookup
  const userGrant = activeGrantsForUser.find(
    (g) => g.documentId === doc.id && g.userId === user.id
  );

  // 5. Evaluate based on requested action
  switch (action) {
    case 'VIEW':
    case 'DOWNLOAD':
      if (userGrant && (userGrant.permissionLevel === 'VIEW' || userGrant.permissionLevel === 'EDIT')) {
        return { allowed: true };
      }
      if (user.role === 'admin') {
        // Administrative read-only audit policy
        return { allowed: true };
      }
      return { allowed: false, reason: 'No active grant for viewing this document' };

    case 'EDIT':
      if (userGrant && userGrant.permissionLevel === 'EDIT') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'EDIT permission required; current grant is VIEW or none' };

    case 'SHARE':
    case 'REVOKE':
      // Viewers and non-owners must never manage permissions
      return { allowed: false, reason: 'Only the document owner can grant or revoke permissions' };

    case 'DELETE':
      // Viewers and non-owners must never delete another user's document
      return { allowed: false, reason: 'Only the document owner can delete this document' };

    default:
      return { allowed: false, reason: 'Unsupported action' };
  }
}

/**
 * Validates uploaded file metadata and constraints
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/png',
  'image/jpeg'
];

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.doc',
  '.xlsx',
  '.txt',
  '.md',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg'
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function sanitizeFilename(filename: string): string {
  // Strip null bytes
  let cleaned = filename.replace(/\0/g, '');
  // Remove directory traversal indicators (e.g. ../ or ..\)
  cleaned = cleaned.replace(/^(\.\.[\/\\])+/, '');
  // Clean special characters and directory separators
  cleaned = cleaned.replace(/[\/\\]/g, '_').replace(/[?%*:|"<>]/g, '_');
  // Strip leading underscores or dots from directory removal
  cleaned = cleaned.replace(/^[_.]+/, '');
  return cleaned || 'unnamed_file';
}

export function validateUploadFile(
  filename: string,
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  if (sizeBytes <= 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds maximum limit of 10MB (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB)` };
  }

  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Disallowed file extension: ${ext}. Allowed formats: PDF, DOCX, XLSX, TXT, CSV, MD, PNG, JPG` };
  }

  // Prevent executable extensions masquerading
  const dangerousExts = ['.exe', '.sh', '.bat', '.cmd', '.py', '.js', '.vbs', '.php', '.pl', '.jar'];
  if (dangerousExts.some((d) => filename.toLowerCase().includes(d))) {
    return { valid: false, error: 'Executable files are strictly rejected' };
  }

  return { valid: true };
}
