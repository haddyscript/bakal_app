import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Session } from '../types';
import { parseSqliteDate } from '../utils/date';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<Nav>();
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      db.getAllAsync<Session>('SELECT * FROM sessions ORDER BY date DESC').then((rows) => {
        if (active) setSessions(rows);
      });
      return () => {
        active = false;
      };
    }, [db])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}>
            <Text style={styles.rowTitle}>{parseSqliteDate(item.date).toLocaleString()}</Text>
            {item.duration_seconds ? (
              <Text style={styles.rowSubtitle}>{Math.round(item.duration_seconds / 60)} min</Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No workouts logged yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 32 },
});
