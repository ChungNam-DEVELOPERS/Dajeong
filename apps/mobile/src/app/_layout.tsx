import { colors } from "@dajeong/design-tokens";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.surface.canvas },
          headerShown: false,
        }}
      />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
