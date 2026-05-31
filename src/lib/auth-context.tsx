'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Cookies from 'js-cookie';
import { auth, companies } from './api';

interface User {
  id: string;
  email: string;
  role: 'company_admin' | 'super_admin';
  companyId?: string;
  companyName?: string;
  companyCity?: string;
  companyUserRole?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type MeResponse = {
  id: string;
  email: string | null;
  role: string;
  companyUsers?: {
    companyId: string;
    role?: string;
    company?: { name?: string; city?: string | null };
  }[];
};

function mapMeToUser(data: MeResponse, companyProfile?: { name?: string; city?: string | null }): User {
  const companyLink = data.companyUsers?.[0];
  const companyFromLink = companyLink?.company;
  const companyId = companyLink?.companyId;
  return {
    id: data.id,
    email: data.email ?? '',
    role: data.role as User['role'],
    companyId,
    companyName: companyProfile?.name ?? companyFromLink?.name,
    companyCity: companyProfile?.city ?? companyFromLink?.city ?? undefined,
    companyUserRole: companyLink?.role,
  };
}

async function resolveUserFromSession(): Promise<User | null> {
  const res = await auth.getMe();
  const data = res.data as MeResponse;

  if (data.role !== 'super_admin' && data.companyUsers?.[0]?.companyId) {
    try {
      const companyRes = await companies.getMe();
      return mapMeToUser(data, companyRes.data);
    } catch {
      return mapMeToUser(data);
    }
  }

  return mapMeToUser(data);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      resolveUserFromSession()
        .then(setUser)
        .catch(() => Cookies.remove('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await auth.login(email, password);
    Cookies.set('token', res.data.accessToken, { expires: 7 });
    const sessionUser = await resolveUserFromSession();
    setUser(sessionUser);
  };

  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
