import { AuthResponse, User } from './types';
import { client } from './client';

export const authApi = {
  register: async (payload: { name: string; email: string; password: string }) => {
    const { data } = await client.post<AuthResponse>('/api/auth/register', payload);
    return data;
  },
  login: async (payload: { email: string; password: string }) => {
    const { data } = await client.post<AuthResponse>('/api/auth/login', payload);
    return data;
  },
  me: async () => {
    const { data } = await client.get<{ user: User }>('/api/auth/me');
    return data.user;
  }
};
