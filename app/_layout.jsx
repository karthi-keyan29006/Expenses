import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ErrorState, LoadingState } from '../src/components/EmptyState';
import { initialiseDatabase } from '../src/database/db';
import { colors, layout } from '../src/theme';

export default function RootLayout() {
  const [status, setStatus] = useState({ ready: false, error: null, attempt: 0 });

  // Open the SQLite database and apply migrations before any screen renders.
  useEffect(() => {
    let active = true;
    initialiseDatabase()
      .then(() => active && setStatus((current) => ({ ...current, ready: true, error: null })))
      .catch((error) => active && setStatus((current) => ({ ...current, ready: false, error })));
    return () => {
      active = false;
    };
  }, [status.attempt]);

  const retry = () =>
    setStatus((current) => ({ ready: false, error: null, attempt: current.attempt + 1 }));

  if (!status.ready) {
    return (
      <View style={[layout.screen, { justifyContent: 'center' }]}>
        <StatusBar style="dark" />
        {status.error ? (
          <ErrorState error={status.error} onRetry={retry} />
        ) : (
          <LoadingState message="Opening your data…" />
        )}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="transactions/add-income" options={{ title: 'Income' }} />
        <Stack.Screen name="transactions/add-expense" options={{ title: 'Expense' }} />
        <Stack.Screen name="goals/add-goal" options={{ title: 'Savings goal' }} />
        <Stack.Screen name="goals/add-transaction" options={{ title: 'Savings' }} />
        <Stack.Screen name="goals/[id]" options={{ title: 'Goal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
