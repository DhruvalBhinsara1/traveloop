import { ActivityInput, ChecklistItem, Note, StopInput, Trip, TripInput } from './types';
import { client } from './client';

type CoverImageUpload = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export const tripsApi = {
  list: async () => {
    const { data } = await client.get<Trip[]>('/api/trips');
    return data;
  },
  create: async (payload: TripInput) => {
    const { data } = await client.post<Trip>('/api/trips', payload);
    return data;
  },
  get: async (id: number) => {
    const { data } = await client.get<Trip>(`/api/trips/${id}`);
    return data;
  },
  remove: async (id: number) => {
    await client.delete(`/api/trips/${id}`);
  },
  share: async (id: number, isPublic = true) => {
    const { data } = await client.patch<{ id: number; isPublic: boolean; shareToken: string | null }>(`/api/trips/${id}/share`, {
      isPublic
    });
    return data;
  },
  updateCover: async (id: number, image: CoverImageUpload) => {
    const formData = new FormData();
    const extension = image.mimeType?.split('/')[1] ?? 'jpg';

    formData.append('cover', {
      uri: image.uri,
      name: image.fileName ?? `trip-${id}-cover.${extension}`,
      type: image.mimeType ?? 'image/jpeg'
    } as unknown as Blob);

    const { data } = await client.patch<Trip>(`/api/trips/${id}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    });
    return data;
  },
  addStop: async (tripId: number, payload: StopInput) => {
    const { data } = await client.post(`/api/trips/${tripId}/stops`, payload);
    return data;
  },
  reorderStops: async (tripId: number, orderedIds: number[]) => {
    const { data } = await client.patch<Trip>(`/api/trips/${tripId}/stops/reorder`, { orderedIds });
    return data;
  },
  addActivity: async (stopId: number, payload: ActivityInput) => {
    const { data } = await client.post(`/api/stops/${stopId}/activities`, payload);
    return data;
  },
  addChecklistItem: async (tripId: number, payload: { label: string; category: string }) => {
    const { data } = await client.post<ChecklistItem>(`/api/trips/${tripId}/checklist`, payload);
    return data;
  },
  toggleChecklistItem: async (id: number, isPacked: boolean) => {
    const { data } = await client.patch<ChecklistItem>(`/api/checklist/${id}`, { isPacked });
    return data;
  },
  addNote: async (tripId: number, content: string) => {
    const { data } = await client.post<Note>(`/api/trips/${tripId}/notes`, { content });
    return data;
  },
  updateNote: async (id: number, content: string) => {
    const { data } = await client.put<Note>(`/api/notes/${id}`, { content });
    return data;
  },
  publicTrip: async (shareToken: string) => {
    const { data } = await client.get<Trip>(`/api/public/${shareToken}`);
    return data;
  }
};
