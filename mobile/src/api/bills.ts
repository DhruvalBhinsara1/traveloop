import { client } from './client';
import { BillSplit, CreateBillExpensePayload, CreateBillParticipantPayload } from './types';

export const billsApi = {
  get: async (tripId: number) => {
    const { data } = await client.get<BillSplit>(`/api/trips/${tripId}/splits`);
    return data;
  },
  addParticipant: async (tripId: number, payload: CreateBillParticipantPayload) => {
    const { data } = await client.post<BillSplit>(`/api/trips/${tripId}/splits/participants`, payload);
    return data;
  },
  removeParticipant: async (id: number) => {
    const { data } = await client.delete<BillSplit>(`/api/splits/participants/${id}`);
    return data;
  },
  addExpense: async (tripId: number, payload: CreateBillExpensePayload) => {
    const { data } = await client.post<BillSplit>(`/api/trips/${tripId}/splits/expenses`, payload);
    return data;
  },
  removeExpense: async (id: number) => {
    const { data } = await client.delete<BillSplit>(`/api/splits/expenses/${id}`);
    return data;
  }
};
