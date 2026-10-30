import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./src/navigation";
import LoginScreen from "./src/screens/LoginScreen";
import EnrollScreen from "./src/screens/EnrollScreen";
import DashboardScreen from "./src/screens/DashboardScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerStyle: { backgroundColor: "#0b1120" }, headerTintColor: "#fff" }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "VoiceBank" }} />
        <Stack.Screen name="Enroll" component={EnrollScreen} options={{ title: "Enroll" }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Accounts" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
