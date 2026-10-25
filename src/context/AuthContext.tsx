/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api.ts';

export interface PersonaPreset {
  key: string;
  label: string;
  email: string;
  name: string;
  role: 'admin' | 'owner' | 'viewer';
  description: string;
  password: string;
}

export const DEMO_PERSONAS: PersonaPreset[] = [
  {
    key: 'admin',
    label: 'Chief Security Officer (Admin)',
    email: 'admin@trustvault.io',
    name: 'Chief Security Officer',
    role: 'admin',
    description: 'System audit oversight, active user management, security logs',
    password: 'TrustVault2026!Admin'
  },
  {
    key: 'alice',
    label: 'Alice Henderson (Owner: Legal)',
    email: 'alice@trustvault.io',
    name: 'Alice Henderson (Legal & M&A)',
    role: 'owner',
    description: 'Owns M&A NDA & SOC2 report; manages collaborator sharing',
    password: 'AlicePass2026!'
  },
  {
    key: 'bob',
    label: 'Bob Martinez (Owner: Finance)',
    email: 'bob@trustvault.io',
    name: 'Bob Martinez (Finance Controller)',
    role: 'owner',
    description: 'Owns Q3 Financial ledger; has EDIT permission on Alice NDA',
    password: 'BobPass2026!'
  },
  {
    key: 'charlie',
    label: 'Charlie Wu (Viewer: External Auditor)',
    email: 'charlie@trustvault.io',
    name: 'Charlie Wu (External Auditor)',
    role: 'viewer',
    description: 'VIEW-only access to shared M&A NDA and Financial ledger; no upload/share rights',
    password: 'CharliePass2026!'
  }
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  switchPersona: (personaKey: string) => Promise<void>;
  changePassword: (cur: string, next: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
    } catch {
      removeStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await api.login(email, pass);
    setUser(data.user);
  };

  const register = async (name: string, email: string, pass: string) => {
    const data = await api.register(name, email, pass);
    setUser(data.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const switchPersona = async (personaKey: string) => {
    const persona = DEMO_PERSONAS.find((p) => p.key === personaKey);
    if (!persona) return;
    setLoading(true);
    try {
      const data = await api.login(persona.email, persona.password);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (cur: string, next: string) => {
    await api.changePassword(cur, next);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        switchPersona,
        changePassword,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
