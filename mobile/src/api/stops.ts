import client from './client';
import type { CreateStopPayload, Id, Stop, Trip, UpdateStopPayload } from './types';

export const stopsApi = {
  async create(tripId: Id, payload: CreateStopPayload) {
    const { data } = await client.post<Stop>(`/api/trips/${tripId}/stops`, payload);
    return data;
  },

  async update(id: Id, payload: UpdateStopPayload) {
    const { data } = await client.put<Stop>(`/api/stops/${id}`, payload);
    return data;
  },

  async remove(id: Id) {
    await client.delete(`/api/stops/${id}`);
  },

  async reorder(tripId: Id, orderedIds: Id[]) {
    const { data } = await client.patch<Trip>(`/api/trips/${tripId}/stops/reorder`, { orderedIds });
    return data;
  }
};
