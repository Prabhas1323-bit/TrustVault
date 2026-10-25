/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'owner' | 'viewer';
export type PermissionLevel = 'VIEW' | 'EDIT';
export type DocumentCategory = 'Personal' | 'Academic' | 'Finance' | 'Legal' | 'Work' | 'Other';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: string;
  category: DocumentCategory;
  description: string;
  ownerId: string;
  ownerEmail?: string;
  createdAt: string;
  updatedAt: string;
  // Computed permission for the requesting user
  userPermission?: 'OWNER' | 'EDIT' | 'VIEW' | 'ADMIN';
  sharedCount?: number;
}

export interface PermissionRecord {
  id: string;
  documentId: string;
  userId: string;
  userEmail: string;
  userName: string;
  permissionLevel: PermissionLevel;
  grantedById: string;
  grantedByEmail: string;
  grantedAt: string;
}

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_DOWNLOAD'
  | 'DOCUMENT_DELETE'
  | 'METADATA_UPDATE'
  | 'PERMISSION_GRANT'
  | 'PERMISSION_REVOKE'
  | 'AUTHORIZATION_DENIED'
  | 'USER_STATUS_CHANGE'
  | 'ADMIN_PROVISION';

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  resourceType: 'DOCUMENT' | 'USER' | 'PERMISSION' | 'AUTH' | 'SYSTEM';
  resourceId: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  ipAddress: string;
  userAgent?: string;
  details?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  totalStorageBytes: number;
  sharedDocumentsCount: number;
  activeGrantsCount: number;
  recentAuditCount: number;
  deniedAttemptsCount: number;
  myDocumentsCount: number;
  sharedWithMeCount: number;
}
