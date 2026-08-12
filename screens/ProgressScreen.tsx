import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-gifted-charts';
import type { Exercise } from '../types';
import { parseSqliteDate } from '../utils/date';

interface ProgressPoint {
  date: string;
  max_weight: number;
}

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [points, setPoints] = useState<ProgressPoint[]>([]);

  const loadExercises = useCallback(async () => {
    const rows = await db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name ASC');
    setExercises(rows);
    setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
  }, [db]);

  const loadProgress = useCallback(
    async (exerciseId: number) => {
      const rows = await db.getAllAsync<ProgressPoint>(
        `SELECT sessions.date as date, MAX(sets.weight) as max_weight
         FROM sets
         JOIN sessions ON sessions.id = sets.session_id
         WHERE sets.exercise_id = ?
         GROUP BY sets.session_id
         ORDER BY sessions.date ASC`,
        exerciseId
      );
      setPoints(rows);
    },
    [db]
  );

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  useFocusEffect(
    useCallback(() => {
      if (selectedId != null) {
        loadProgress(selectedId);
      }
    }, [selectedId, loadProgress])
  );

  const chartData = points.map((p) => ({
    value: p.max_weight,
    label: parseSqliteDate(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillRow}
        contentContainerStyle={styles.pillRowContent}
      >
        {exercises.map((ex) => (
          <Pressable
            key={ex.id}
            style={[styles.pill, ex.id === selectedId && styles.pillActive]}
            onPress={() => setSelectedId(ex.id)}
          >
            <Text style={[styles.pillText, ex.id === selectedId && styles.pillTextActive]}>{ex.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {exercises.length === 0 ? (
        <Text style={styles.empty}>Add exercises and log some sets to see progress here.</Text>
      ) : chartData.length < 2 ? (
        <Text style={styles.empty}>Log this exercise in at least 2 workouts to see a trend.</Text>
      ) : (
        <View style={styles.chartWrap}>
          <Text style={styles.chartTitle}>Top set weight (kg) per workout</Text>
          <LineChart
            data={chartData}
            thickness={3}
            color="#111"
            dataPointsColor="#111"
            noOfSections={4}
            spacing={Math.max(40, 280 / chartData.length)}
            yAxisTextStyle={{ color: '#666' }}
            xAxisLabelTextStyle={{ color: '#666', fontSize: 10 }}
            hideRules
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  pillRow: { maxHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  pillRowContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f2f2f2' },
  pillActive: { backgroundColor: '#111' },
  pillText: { color: '#333', fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  chartWrap: { padding: 16 },
  chartTitle: { fontSize: 14, fontWeight: '600', marginBottom: 16, color: '#333' },
  empty: { textAlign: 'center', color: '#999', marginTop: 32, paddingHorizontal: 24 },
});
