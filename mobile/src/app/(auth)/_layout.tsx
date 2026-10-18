import { Stack } from 'expo-router';
import { Palette } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.primary500 },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login"    options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
    </Stack>
  );
}
