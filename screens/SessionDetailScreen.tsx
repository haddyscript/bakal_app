import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { parseSqliteDate } from '../utils/date';

interface SetRow {
  set_id: number;
  weight: number;
  reps: number;
  set_order: number;
  exercise_name: string;
}

type Route = RouteProp<RootStackParamList, 'SessionDetail'>;

export default function SessionDetailScreen() {
  const db = useSQLiteContext();
  const route = useRoute<Route>();
  const { sessionId } = route.params;
  const [rows, setRows] = useState<SetRow[]>([]);
  const [sessionDate, setSessionDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const session = await db.getFirstAsync<{ date: string }>('SELECT date FROM sessions WHERE id = ?', sessionId);
      setSessionDate(session?.date ?? null);

      const setRows = await db.getAllAsync<SetRow>(
        `SELECT sets.id as set_id, sets.weight, sets.reps, sets.set_order, exercises.name as exercise_name
         FROM sets
         JOIN exercises ON exercises.id = sets.exercise_id
         WHERE sets.session_id = ?
         ORDER BY exercises.name ASC, sets.set_order ASC`,
        sessionId
      );
      setRows(setRows);
    })();
  }, [db, sessionId]);

  return (
    <View style={styles.container}>
      {sessionDate ? <Text style={styles.header}>{parseSqliteDate(sessionDate).toLocaleString()}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.set_id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Text style={styles.row}>
            {item.exercise_name} — Set {item.set_order}: {item.weight} kg x {item.reps}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No sets logged for this session.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  list: { padding: 16 },
  row: { paddingVertical: 8, fontSize: 15 },
  empty: { textAlign: 'center', color: '#999', marginTop: 32 },
});
