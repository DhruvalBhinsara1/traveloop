import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '../api/auth';
import { clearAuthToken, getAuthToken, setAuthToken } from '../api/tokenStorage';
import { User } from '../api/types';

type AvatarUpload = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (name: string, username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (payload: { name: string; username: string }) => Promise<User>;
  updateAvatar: (image: AvatarUpload) => Promise<User>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      try {
        const token = await getAuthToken();
        if (token) {
          const profile = await authApi.me();
          if (mounted) setUser(profile);
        }
      } catch {
        await clearAuthToken();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    restore();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (identifier, password) => {
        const response = await authApi.login({ identifier, password });
        await setAuthToken(response.token);
        setUser(response.user);
      },
      signUp: async (name, username, email, password) => {
        const response = await authApi.register({ name, username, email, password });
        await setAuthToken(response.token);
        setUser(response.user);
      },
      signOut: async () => {
        await clearAuthToken();
        setUser(null);
      },
      updateProfile: async (payload) => {
        const profile = await authApi.updateProfile(payload);
        setUser(profile);
        return profile;
      },
      updateAvatar: async (image) => {
        const profile = await authApi.updateAvatar(image);
        setUser(profile);
        return profile;
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
