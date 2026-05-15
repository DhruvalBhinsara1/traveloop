import { client } from './client';
import { BillSplit, CreateBillExpensePayload, CreateBillParticipantPayload, CreateBillSettlementPayload } from './types';

const isRouteNotFound = (error: unknown) => {
  const response = (error as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response;
  const message = response?.data?.error ?? response?.data?.message ?? '';
  return response?.status === 404 && /route not found/i.test(message);
};

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
  updateExpense: async (id: number, payload: CreateBillExpensePayload) => {
    const { data } = await client.patch<BillSplit>(`/api/splits/expenses/${id}`, payload);
    return data;
  },
  removeExpense: async (id: number) => {
    const { data } = await client.delete<BillSplit>(`/api/splits/expenses/${id}`);
    return data;
  },
  addSettlement: async (tripId: number, payload: CreateBillSettlementPayload) => {
    try {
      const { data } = await client.post<BillSplit>(`/api/trips/${tripId}/splits/settlements`, payload);
      return data;
    } catch (error) {
      if (!isRouteNotFound(error)) throw error;
      const { data } = await client.post<BillSplit>('/api/splits/settlements', { ...payload, tripId });
      return data;
    }
  },
  removeSettlement: async (id: number) => {
    const { data } = await client.delete<BillSplit>(`/api/splits/settlements/${id}`);
    return data;
  },
  clearSettlements: async (tripId: number) => {
    const { data } = await client.delete<BillSplit>(`/api/trips/${tripId}/splits/settlements`);
    return data;
  }
};
