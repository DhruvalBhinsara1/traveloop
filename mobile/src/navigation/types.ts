export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Trips: undefined;
  Create: undefined;
  Profile: undefined;
};

export type MainTabParamList = MainTabsParamList;

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  CreateTrip: undefined;
  TripDetail: { tripId: number };
  PublicTrip: { shareToken: string };
};

export type TripDetailTabParamList = {
  Itinerary: undefined;
  Budget: undefined;
  Checklist: undefined;
  Notes: undefined;
};
