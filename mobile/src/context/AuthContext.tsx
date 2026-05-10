import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '../api/auth';
import { AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY } from '../api/client';
import { User } from '../api/types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      try {
        const token = (await AsyncStorage.getItem(AUTH_TOKEN_KEY)) ?? (await AsyncStorage.getItem(LEGACY_AUTH_TOKEN_KEY));
        if (token) {
          const profile = await authApi.me();
          if (mounted) setUser(profile);
        }
      } catch {
        await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY]);
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
      signIn: async (email, password) => {
        const response = await authApi.login({ email, password });
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token);
        setUser(response.user);
      },
      signUp: async (name, email, password) => {
        const response = await authApi.register({ name, email, password });
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token);
        setUser(response.user);
      },
      signOut: async () => {
        await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY]);
        setUser(null);
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
