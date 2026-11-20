import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  initNotificationChannelsAndCategories,
  syncAllScheduledNotifications,
  registerNotificationResponseListener,
} from '../src/services/notifications';
import { useAppTheme } from '../src/theme/useAppTheme';
import { DialogProvider } from '../src/context/DialogContext';

export default function RootLayout() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  useEffect(() => {
    // 1. Initialize notification channels and categories
    initNotificationChannelsAndCategories().catch((err) => {
      console.warn('[Taskion] Error initializing notification channels:', err);
    });

    // 2. Sync all future scheduled notifications
    syncAllScheduledNotifications().catch((err) => {
      console.warn('[Taskion] Error syncing notifications:', err);
    });

    // 3. Register notification action response listener
    const subscription = registerNotificationResponseListener((taskId, action) => {
      if (action === 'TAP') {
        router.push({
          pathname: '/task/[id]',
          params: { id: taskId },
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <DialogProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="new-reminder"
              options={{
                presentation: 'modal',
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="task/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
          </Stack>
        </DialogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
