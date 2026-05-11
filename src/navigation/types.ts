import { Whisky } from "../types/database";

export type WhiskyPrefill = {
  name?: string;
  distillery?: string;
  region?: string;
  country?: string;
  age?: number;
  abv?: number;
  bottle_size?: number;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type FeedStackParamList = {
  Feed: undefined;
  WhiskyDetail: { whiskyId: string };
  CheckIn: { whisky: Whisky; existingCheckinId?: string };
};

export type SearchStackParamList = {
  Search: undefined;
  WhiskyDetail: { whiskyId: string };
  CheckIn: { whisky: Whisky; existingCheckinId?: string };
  ManualEntry: { barcode?: string; prefill?: WhiskyPrefill };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Admin: undefined;
  EditWhisky: { whiskyId: string };
};

export type AppTabParamList = {
  FeedTab: undefined;
  SearchTab: undefined;
  ProfileTab: undefined;
};
