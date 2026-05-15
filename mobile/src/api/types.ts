export type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  createdAt?: string;
};

export type Id = number;

export type PublicUser = Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'createdAt'>;

export type UserRelationship = 'none' | 'friend' | 'request_sent' | 'request_received';

export type UserSearchResult = PublicUser & {
  relationship: UserRelationship;
};

export type FriendRequest = {
  id: number;
  requesterId: number;
  recipientId: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string | null;
  requester: PublicUser;
  recipient: PublicUser;
};

export type FriendRequestsResponse = {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};

export type FriendGroupMember = {
  id: number;
  groupId: number;
  userId: number;
  createdAt: string;
  user: PublicUser;
};

export type FriendGroup = {
  id: number;
  name: string;
  ownerId: number;
  owner?: PublicUser;
  members: FriendGroupMember[];
  createdAt: string;
  updatedAt: string;
};

export type TripMember = {
  id: number;
  role: 'editor' | string;
  tripId: number;
  userId: number;
  user: PublicUser;
  createdAt: string;
};

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
  userId?: number | null;
  user?: PublicUser | null;
  status?: 'active' | 'guest' | 'former' | 'archived' | string;
  archivedAt?: string | null;
  canRemove: boolean;
  isActiveTripUser?: boolean;
  canUseInNewExpense?: boolean;
  canArchive?: boolean;
  createdAt: string;
};

export type BillSplitMode = 'equal' | 'exact' | 'percent' | 'shares';

export type BillExpensePayment = {
  id: number;
  expenseId: number;
  participantId: number;
  amountCents: number;
  amount: number;
  createdAt: string;
};

export type BillExpenseShare = {
  id: number;
  expenseId: number;
  participantId: number;
  amountCents: number;
  amount: number;
  percentBps?: number | null;
  shares?: number | null;
  createdAt: string;
};

export type BillExpense = {
  id: number;
  title: string;
  amount: number;
  amountCents?: number;
  currency?: string;
  splitMode?: BillSplitMode;
  category?: string | null;
  note?: string | null;
  paidAt?: string;
  tripId: number;
  paidById: number;
  paidBy?: BillParticipant;
  payments?: BillExpensePayment[];
  shares?: BillExpenseShare[];
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdByUserId?: number | null;
  updatedByUserId?: number | null;
  deletedByUserId?: number | null;
};

export type BillBalance = {
  participantId: number;
  name: string;
  amount: number;
  paidCents?: number;
  owedCents?: number;
  settlementPaidCents?: number;
  settlementReceivedCents?: number;
  netCents?: number;
};

export type BillSettlement = {
  id?: number;
  fromParticipantId: number;
  from: string;
  toParticipantId: number;
  to: string;
  amount: number;
  amountCents?: number;
  currency?: string;
  note?: string | null;
  settledAt?: string;
  createdAt?: string;
};

export type BillSplit = {
  participants: BillParticipant[];
  expenses: BillExpense[];
  settlements?: BillSettlement[];
  summary: {
    total: number;
    totalCents?: number;
    currency?: string;
    perPerson: number;
    balances: BillBalance[];
    suggestedSettlements?: BillSettlement[];
    settlements: BillSettlement[];
  };
};

export type Trip = {
  id: number;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  budget?: number | null;
  currency?: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  shareToken?: string | null;
  userId?: number;
  groupId?: number | null;
  user?: PublicUser;
  members?: TripMember[];
  group?: FriendGroup | null;
  stops: Stop[];
  checklist: ChecklistItem[];
  notes: Note[];
  billExpenses?: BillExpense[];
  billSettlements?: BillSettlement[];
  createdAt?: string;
  updatedAt?: string;
};

export type PublicTripActivity = {
  name: string;
  description?: string | null;
  category: ActivityCategory | string;
  cost: number;
  duration?: number | null;
  date?: string | null;
};

export type PublicTripStop = {
  cityName: string;
  country: string;
  arrivalDate: string;
  departDate: string;
  order: number;
  activities: PublicTripActivity[];
};

export type PublicTrip = {
  title: string;
  description?: string | null;
  coverImage?: string | null;
  budget?: number | null;
  startDate: string;
  endDate: string;
  user?: Omit<PublicUser, 'id' | 'createdAt'> | null;
  stops: PublicTripStop[];
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
  memberIds?: number[];
  groupId?: number | null;
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
  identifier: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  username: string;
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
  amount?: number;
  amountCents?: number;
  paidById: number;
  paidAt?: string;
  category?: string | null;
  note?: string | null;
  split?: {
    mode: BillSplitMode;
    participantIds?: number[];
    shares?: Array<{
      participantId: number;
      amount?: number;
      amountCents?: number;
      percentBps?: number;
      shares?: number;
    }>;
  };
};

export type CreateBillSettlementPayload = {
  fromParticipantId: number;
  toParticipantId: number;
  amount?: number;
  amountCents?: number;
  settledAt?: string;
  note?: string | null;
};
