import client from './client';
import type { CreateNotePayload, Id, Note, UpdateNotePayload } from './types';

export const notesApi = {
  async list(tripId: Id) {
    const { data } = await client.get<Note[]>(`/api/trips/${tripId}/notes`);
    return data;
  },

  async create(tripId: Id, payload: CreateNotePayload) {
    const { data } = await client.post<Note>(`/api/trips/${tripId}/notes`, payload);
    return data;
  },

  async update(id: Id, payload: UpdateNotePayload) {
    const { data } = await client.put<Note>(`/api/notes/${id}`, payload);
    return data;
  },

  async remove(id: Id) {
    await client.delete(`/api/notes/${id}`);
  }
};
