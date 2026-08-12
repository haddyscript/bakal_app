import { useCallback, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Text from '../components/Text';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import { setStatusBarStyle } from 'expo-status-bar';
import type { Exercise } from '../types';
import { parseSqliteDate } from '../utils/date';

interface ProgressPoint {
  date: string;
  max_weight: number;
}

const RED = '#e5484d';

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
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
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

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const current = points[points.length - 1].max_weight;
    const best = Math.max(...points.map((p) => p.max_weight));
    const change = current - points[0].max_weight;
    return { current, best, change };
  }, [points]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillRow}
        contentContainerStyle={styles.pillRowContent}
      >
        {exercises.map((ex) => {
          const active = ex.id === selectedId;
          return (
            <Pressable key={ex.id} onPress={() => setSelectedId(ex.id)}>
              {active ? (
                <View style={[styles.pill, styles.pillActive]}>
                  <Text style={styles.pillTextActive}>{ex.name}</Text>
                </View>
              ) : (
                <BlurView intensity={30} tint="dark" style={styles.pill}>
                  <Text style={styles.pillText}>{ex.name}</Text>
                </BlurView>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {exercises.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="stats-chart-outline" size={36} color="#444" />
          <Text style={styles.empty}>No exercises yet</Text>
          <Text style={styles.emptySubtitle}>Add exercises and log some sets to see progress here.</Text>
        </View>
      ) : chartData.length < 2 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="trending-up-outline" size={36} color="#444" />
          <Text style={styles.empty}>Not enough data yet</Text>
          <Text style={styles.emptySubtitle}>Log this exercise in at least 2 workouts to see a trend.</Text>
        </View>
      ) : (
        <View style={styles.chartCardWrap}>
          <BlurView intensity={40} tint="dark" style={styles.chartCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 1 }}
              style={styles.chartCardSheen}
            />

            {stats ? (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.current}</Text>
                  <Text style={styles.statLabel}>Current (kg)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.best}</Text>
                  <Text style={styles.statLabel}>Best (kg)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, stats.change >= 0 ? styles.statPositive : styles.statNegative]}>
                    {stats.change >= 0 ? '+' : ''}
                    {stats.change}
                  </Text>
                  <Text style={styles.statLabel}>Change (kg)</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.chartTitle}>Top set weight per workout</Text>
            <LineChart
              data={chartData}
              thickness={3}
              color={RED}
              dataPointsColor={RED}
              curved
              areaChart
              startFillColor="rgba(229,72,77,0.25)"
              endFillColor="rgba(229,72,77,0)"
              startOpacity={0.5}
              endOpacity={0}
              noOfSections={4}
              spacing={Math.max(40, 260 / chartData.length)}
              yAxisTextStyle={{ color: '#888' }}
              xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
              yAxisColor="rgba(255,255,255,0.1)"
              xAxisColor="rgba(255,255,255,0.1)"
              hideRules
            />
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  pillRow: { maxHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  pillRowContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  pillActive: { backgroundColor: RED, borderColor: RED },
  pillText: { color: '#ccc', fontWeight: '600' },
  pillTextActive: { color: '#fff', fontWeight: '600' },

  chartCardWrap: {
    margin: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  chartCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 20 },
  chartCardSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statPositive: { color: '#4ade80' },
  statNegative: { color: RED },
  statLabel: { color: '#999', fontSize: 11, marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: 'rgba(255,255,255,0.14)' },

  chartTitle: { fontSize: 13, fontWeight: '600', marginBottom: 16, color: '#999' },

  emptyWrap: { alignItems: 'center', marginTop: 80, gap: 8, paddingHorizontal: 24 },
  empty: { textAlign: 'center', color: '#999', fontSize: 15, fontWeight: '600', marginTop: 4 },
  emptySubtitle: { textAlign: 'center', color: '#666', fontSize: 13 },
});
