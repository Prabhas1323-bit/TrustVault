/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentRecord, PermissionRecord, AuditLogRecord, DashboardStats, User } from '../types/index.ts';

const TOKEN_KEY = 'trustvault_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMsg = errData.error;
      }
    } catch {
      // Non-JSON error
    }
    throw new Error(errorMsg);
  }

  // Handle binary downloads
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('octet-stream') || contentType.includes('spreadsheetml') || contentType.includes('msword'))) {
    return response.blob() as unknown as T;
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setStoredToken(data.token);
    return data;
  },

  async register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    setStoredToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      removeStoredToken();
    }
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // Documents
  async getDocuments(params?: { search?: string; category?: string }): Promise<{ documents: DocumentRecord[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ documents: DocumentRecord[] }>(`/api/documents${qs}`);
  },

  async getDocument(id: string): Promise<{ document: DocumentRecord }> {
    return request<{ document: DocumentRecord }>(`/api/documents/${id}`);
  },

  async uploadDocument(formData: FormData): Promise<{ message: string; document: DocumentRecord }> {
    return request<{ message: string; document: DocumentRecord }>('/api/documents/upload', {
      method: 'POST',
      body: formData
    });
  },

  async downloadDocument(id: string, originalFilename: string): Promise<void> {
    const token = getStoredToken();
    const response = await fetch(`/api/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      let errorMsg = 'Download failed';
      try {
        const err = await response.json();
        errorMsg = err.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async updateMetadata(id: string, updates: { title?: string; category?: string; description?: string }): Promise<{ document: DocumentRecord }> {
    return request<{ document: DocumentRecord }>(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteDocument(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/documents/${id}`, {
      method: 'DELETE'
    });
  },

  // Permissions & Sharing
  async getPermissions(documentId: string): Promise<{ permissions: PermissionRecord[] }> {
    return request<{ permissions: PermissionRecord[] }>(`/api/documents/${documentId}/permissions`);
  },

  async grantPermission(documentId: string, userId: string, permissionLevel: 'VIEW' | 'EDIT'): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/documents/${documentId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ userId, permissionLevel })
    });
  },

  async revokePermission(documentId: string, userId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/documents/${documentId}/permissions/${userId}`, {
      method: 'DELETE'
    });
  },

  // Admin
  async getAuditLogs(): Promise<{ logs: AuditLogRecord[] }> {
    return request<{ logs: AuditLogRecord[] }>('/api/admin/audit-logs');
  },

  async getUsers(): Promise<{ users: User[] }> {
    return request<{ users: User[] }>('/api/admin/users');
  },

  async toggleUserStatus(userId: string): Promise<{ message: string; user: User }> {
    return request<{ message: string; user: User }>(`/api/admin/users/${userId}/toggle-status`, {
      method: 'POST'
    });
  },

  // Stats
  async getStats(): Promise<{ stats: DashboardStats }> {
    return request<{ stats: DashboardStats }>('/api/stats');
  },

  // Reset seed (for assessment testing)
  async resetSeed(): Promise<void> {
    await request('/api/admin/reset-seed', { method: 'POST' });
  }
};
