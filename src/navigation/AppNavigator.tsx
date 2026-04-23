import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import {
  AppTabParamList,
  FeedStackParamList,
  ScanStackParamList,
  SearchStackParamList,
  ProfileStackParamList,
} from "./types";

import FeedScreen from "../screens/FeedScreen";
import ScannerScreen from "../screens/ScannerScreen";
import SearchScreen from "../screens/SearchScreen";
import ProfileScreen from "../screens/ProfileScreen";
import WhiskyDetailScreen from "../screens/WhiskyDetailScreen";
import CheckInScreen from "../screens/CheckInScreen";
import ManualEntryScreen from "../screens/ManualEntryScreen";
import AdminScreen from "../screens/AdminScreen";
import EditWhiskyScreen from "../screens/EditWhiskyScreen";

const Tab = createBottomTabNavigator<AppTabParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const ScanStack = createNativeStackNavigator<ScanStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: "#1a0e00" },
  headerTintColor: "#c8963e",
  headerTitleStyle: { fontWeight: "700" as const },
  contentStyle: { backgroundColor: "#1a0e00" },
};

function FeedNav() {
  return (
    <FeedStack.Navigator screenOptions={screenOptions}>
      <FeedStack.Screen name="Feed" component={FeedScreen} options={{ title: "DramLog" }} />
      <FeedStack.Screen name="WhiskyDetail" component={WhiskyDetailScreen} options={{ title: "" }} />
      <FeedStack.Screen name="CheckIn" component={CheckInScreen} options={{ title: "Log Check-in" }} />
    </FeedStack.Navigator>
  );
}

function ScanNav() {
  return (
    <ScanStack.Navigator screenOptions={screenOptions}>
      <ScanStack.Screen name="Scanner" component={ScannerScreen} options={{ title: "Scan Bottle" }} />
      <ScanStack.Screen name="WhiskyDetail" component={WhiskyDetailScreen} options={{ title: "" }} />
      <ScanStack.Screen name="CheckIn" component={CheckInScreen} options={{ title: "Log Check-in" }} />
      <ScanStack.Screen name="ManualEntry" component={ManualEntryScreen} options={{ title: "Add Whisky" }} />
    </ScanStack.Navigator>
  );
}

function SearchNav() {
  return (
    <SearchStack.Navigator screenOptions={screenOptions}>
      <SearchStack.Screen name="Search" component={SearchScreen} options={{ title: "Search" }} />
      <SearchStack.Screen name="WhiskyDetail" component={WhiskyDetailScreen} options={{ title: "" }} />
      <SearchStack.Screen name="CheckIn" component={CheckInScreen} options={{ title: "Log Check-in" }} />
      <SearchStack.Screen name="ManualEntry" component={ManualEntryScreen} options={{ title: "Add Whisky" }} />
    </SearchStack.Navigator>
  );
}

function ProfileNav() {
  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <ProfileStack.Screen name="Admin" component={AdminScreen} options={{ title: "Admin Panel" }} />
      <ProfileStack.Screen name="EditWhisky" component={EditWhiskyScreen} options={{ title: "Edit Whisky" }} />
    </ProfileStack.Navigator>
  );
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    FeedTab: "🥃",
    ScanTab: "📷",
    SearchTab: "🔍",
    ProfileTab: "👤",
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icons[label]}</Text>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1a0e00",
          borderTopColor: "#3a2010",
          paddingBottom: 4,
        },
        tabBarActiveTintColor: "#c8963e",
        tabBarInactiveTintColor: "#6a5040",
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="FeedTab" component={FeedNav} options={{ title: "Feed" }} />
      <Tab.Screen name="ScanTab" component={ScanNav} options={{ title: "Scan" }} />
      <Tab.Screen name="SearchTab" component={SearchNav} options={{ title: "Search" }} />
      <Tab.Screen name="ProfileTab" component={ProfileNav} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
