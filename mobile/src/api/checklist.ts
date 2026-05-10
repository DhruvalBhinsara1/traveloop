import client from './client';
import type { ChecklistItem, CreateChecklistPayload, Id, UpdateChecklistPayload } from './types';

export const checklistApi = {
  async list(tripId: Id) {
    const { data } = await client.get<ChecklistItem[]>(`/api/trips/${tripId}/checklist`);
    return data;
  },

  async create(tripId: Id, payload: CreateChecklistPayload) {
    const { data } = await client.post<ChecklistItem>(`/api/trips/${tripId}/checklist`, payload);
    return data;
  },

  async update(id: Id, payload: UpdateChecklistPayload) {
    const { data } = await client.patch<ChecklistItem>(`/api/checklist/${id}`, payload);
    return data;
  },

  async remove(id: Id) {
    await client.delete(`/api/checklist/${id}`);
  }
};
