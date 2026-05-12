import { AuthResponse, RegisterPayload, User } from './types';
import { client } from './client';

type AvatarUpload = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type ProfileUpdatePayload = {
  name: string;
  username: string;
};

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const { data } = await client.post<AuthResponse>('/api/auth/register', payload);
    return data;
  },
  login: async (payload: { identifier: string; password: string }) => {
    const { data } = await client.post<AuthResponse>('/api/auth/login', payload);
    return data;
  },
  me: async () => {
    const { data } = await client.get<{ user: User }>('/api/auth/me');
    return data.user;
  },
  updateProfile: async (payload: ProfileUpdatePayload) => {
    const { data } = await client.patch<{ user: User }>('/api/auth/me', payload);
    return data.user;
  },
  updateAvatar: async (image: AvatarUpload) => {
    const formData = new FormData();
    const extension = image.mimeType?.split('/')[1] ?? 'jpg';

    formData.append('avatar', {
      uri: image.uri,
      name: image.fileName ?? `profile-photo.${extension}`,
      type: image.mimeType ?? 'image/jpeg'
    } as unknown as Blob);

    const { data } = await client.patch<{ user: User }>('/api/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    });
    return data.user;
  }
};
