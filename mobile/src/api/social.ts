import { client } from './client';
import {
  FriendGroup,
  FriendRequestsResponse,
  PublicUser,
  UserSearchResult
} from './types';

export const socialApi = {
  searchUsers: async (username: string) => {
    const { data } = await client.get<UserSearchResult[]>('/api/users/search', {
      params: { username }
    });
    return data;
  },
  friends: async () => {
    const { data } = await client.get<PublicUser[]>('/api/friends');
    return data;
  },
  requests: async () => {
    const { data } = await client.get<FriendRequestsResponse>('/api/friends/requests');
    return data;
  },
  sendFriendRequest: async (payload: { userId?: number; username?: string }) => {
    const { data } = await client.post('/api/friends/requests', payload);
    return data;
  },
  respondFriendRequest: async (id: number, action: 'accept' | 'decline') => {
    const { data } = await client.patch(`/api/friends/requests/${id}`, { action });
    return data;
  },
  removeFriend: async (userId: number) => {
    await client.delete(`/api/friends/${userId}`);
  },
  groups: async () => {
    const { data } = await client.get<FriendGroup[]>('/api/groups');
    return data;
  },
  createGroup: async (payload: { name: string; memberIds: number[] }) => {
    const { data } = await client.post<FriendGroup>('/api/groups', payload);
    return data;
  },
  getGroup: async (id: number) => {
    const { data } = await client.get<FriendGroup>(`/api/groups/${id}`);
    return data;
  },
  updateGroup: async (id: number, payload: { name: string }) => {
    const { data } = await client.patch<FriendGroup>(`/api/groups/${id}`, payload);
    return data;
  },
  deleteGroup: async (id: number) => {
    await client.delete(`/api/groups/${id}`);
  },
  addGroupMember: async (id: number, userId: number) => {
    const { data } = await client.post<FriendGroup>(`/api/groups/${id}/members`, { userId });
    return data;
  },
  removeGroupMember: async (id: number, userId: number) => {
    const { data } = await client.delete<FriendGroup>(`/api/groups/${id}/members/${userId}`);
    return data;
  }
};
