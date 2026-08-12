import { Suspense, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import RootNavigator from './navigation/RootNavigator';
import { DATABASE_NAME, migrateDbIfNeeded } from './db/database';
import { useAppLock } from './hooks/useAppLock';
import LockScreen from './components/LockScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  const { unlocked, authenticating, retry } = useAppLock();

  return (
    <SafeAreaProvider>
      {unlocked ? (
        <Suspense fallback={<Loading />}>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded} useSuspense>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </SQLiteProvider>
        </Suspense>
      ) : (
        <LockScreen authenticating={authenticating} onRetry={retry} />
      )}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
