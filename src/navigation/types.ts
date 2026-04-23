import { Whisky } from "../types/database";

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type FeedStackParamList = {
  Feed: undefined;
  WhiskyDetail: { whiskyId: string };
  CheckIn: { whisky: Whisky; existingCheckinId?: string };
};

export type ScanStackParamList = {
  Scanner: undefined;
  WhiskyDetail: { whiskyId: string };
  CheckIn: { whisky: Whisky; existingCheckinId?: string };
  ManualEntry: { barcode?: string };
};

export type SearchStackParamList = {
  Search: undefined;
  WhiskyDetail: { whiskyId: string };
  CheckIn: { whisky: Whisky; existingCheckinId?: string };
  ManualEntry: { barcode?: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Admin: undefined;
  EditWhisky: { whiskyId: string };
};

export type AppTabParamList = {
  FeedTab: undefined;
  ScanTab: undefined;
  SearchTab: undefined;
  ProfileTab: undefined;
};
