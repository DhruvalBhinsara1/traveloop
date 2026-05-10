export type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt?: string;
};

export type Id = number;

export type ActivityCategory = 'sightseeing' | 'food' | 'adventure' | 'transport' | 'stay' | 'other';
export type ChecklistCategory = 'clothing' | 'documents' | 'electronics' | 'toiletries' | 'health' | 'other';

export type Activity = {
  id: number;
  name: string;
  description?: string | null;
  category: ActivityCategory;
  cost: number;
  duration?: number | null;
  date?: string | null;
  stopId: number;
};

export type Stop = {
  id: number;
  cityName: string;
  country: string;
  arrivalDate: string;
  departDate: string;
  order: number;
  tripId: number;
  activities: Activity[];
};

export type ChecklistItem = {
  id: number;
  label: string;
  isPacked: boolean;
  category: ChecklistCategory;
  tripId: number;
};

export type Note = {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  tripId: number;
};

export type BillParticipant = {
  id: number;
  name: string;
  tripId: number;
  createdAt: string;
};

export type BillExpense = {
  id: number;
  title: string;
  amount: number;
  tripId: number;
  paidById: number;
  paidBy?: BillParticipant;
  createdAt: string;
};

export type BillBalance = {
  participantId: number;
  name: string;
  amount: number;
};

export type BillSettlement = {
  fromParticipantId: number;
  from: string;
  toParticipantId: number;
  to: string;
  amount: number;
};

export type BillSplit = {
  participants: BillParticipant[];
  expenses: BillExpense[];
  summary: {
    total: number;
    perPerson: number;
    balances: BillBalance[];
    settlements: BillSettlement[];
  };
};

export type Trip = {
  id: number;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  budget?: number | null;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  shareToken?: string | null;
  userId?: number;
  user?: Pick<User, 'name' | 'avatarUrl'>;
  stops: Stop[];
  checklist: ChecklistItem[];
  notes: Note[];
  billExpenses?: BillExpense[];
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type TripInput = {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget?: number | null;
  coverImage?: string | null;
  isPublic?: boolean;
};

export type StopInput = {
  cityName: string;
  country: string;
  arrivalDate: string;
  departDate: string;
  order?: number;
};

export type ActivityInput = {
  name: string;
  category: ActivityCategory | string;
  cost: number;
  description?: string;
  duration?: number | null;
  date?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type CreateTripPayload = TripInput & {
  budget?: number;
};

export type UpdateTripPayload = Partial<CreateTripPayload> & {
  isPublic?: boolean;
};

export type CreateStopPayload = StopInput & {
  order: number;
};

export type UpdateStopPayload = Partial<CreateStopPayload>;

export type CreateActivityPayload = {
  name: string;
  description?: string;
  category: ActivityCategory;
  cost: number;
  duration?: number;
  date?: string;
};

export type UpdateActivityPayload = Partial<CreateActivityPayload>;

export type CreateChecklistPayload = {
  label: string;
  category: ChecklistCategory;
};

export type UpdateChecklistPayload = {
  label?: string;
  category?: ChecklistCategory;
  isPacked?: boolean;
};

export type CreateNotePayload = {
  content: string;
};

export type UpdateNotePayload = {
  content: string;
};

export type CreateBillParticipantPayload = {
  name: string;
};

export type CreateBillExpensePayload = {
  title: string;
  amount: number;
  paidById: number;
};
