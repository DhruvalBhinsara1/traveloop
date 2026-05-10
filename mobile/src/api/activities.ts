import client from './client';
import type { Activity, CreateActivityPayload, Id, UpdateActivityPayload } from './types';

export const activitiesApi = {
  async create(stopId: Id, payload: CreateActivityPayload) {
    const { data } = await client.post<Activity>(`/api/stops/${stopId}/activities`, payload);
    return data;
  },

  async update(id: Id, payload: UpdateActivityPayload) {
    const { data } = await client.put<Activity>(`/api/activities/${id}`, payload);
    return data;
  },

  async remove(id: Id) {
    await client.delete(`/api/activities/${id}`);
  }
};
