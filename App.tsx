import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './navigation/RootNavigator';
import { DATABASE_NAME, migrateDbIfNeeded } from './db/database';

export default function App() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded} useSuspense>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </SQLiteProvider>
      </Suspense>
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
