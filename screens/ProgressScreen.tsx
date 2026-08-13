import { useCallback, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import { setStatusBarStyle } from 'expo-status-bar';
import type { Exercise, BodyWeightEntry } from '../types';
import { parseSqliteDate } from '../utils/date';

interface ProgressPoint {
  date: string;
  max_weight: number;
  volume: number;
}

type Metric = 'weight' | 'volume';
type Selection = number | 'bodyweight' | null;

const RED = '#e5484d';

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<Selection>(null);
  const [points, setPoints] = useState<ProgressPoint[]>([]);
  const [metric, setMetric] = useState<Metric>('weight');
  const [bodyWeights, setBodyWeights] = useState<BodyWeightEntry[]>([]);
  const [bwInput, setBwInput] = useState('');

  const loadExercises = useCallback(async () => {
    const rows = await db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name ASC');
    setExercises(rows);
    setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
  }, [db]);

  const loadBodyWeights = useCallback(async () => {
    const rows = await db.getAllAsync<BodyWeightEntry>('SELECT * FROM body_weight ORDER BY date ASC');
    setBodyWeights(rows);
  }, [db]);

  async function addBodyWeight() {
    const weight = parseFloat(bwInput);
    if (!Number.isFinite(weight)) return;
    await db.runAsync("INSERT INTO body_weight (weight, date) VALUES (?, datetime('now'))", weight);
    setBwInput('');
    loadBodyWeights();
  }

  function deleteBodyWeight(entry: BodyWeightEntry) {
    Alert.alert('Delete entry?', `Remove the ${entry.weight}kg entry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM body_weight WHERE id = ?', entry.id);
          loadBodyWeights();
        },
      },
    ]);
  }

  const loadProgress = useCallback(
    async (exerciseId: number) => {
      const rows = await db.getAllAsync<ProgressPoint>(
        `SELECT sessions.date as date, MAX(sets.weight) as max_weight, SUM(sets.weight * sets.reps) as volume
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
      loadBodyWeights();
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [loadExercises, loadBodyWeights])
  );

  useFocusEffect(
    useCallback(() => {
      if (typeof selectedId === 'number') {
        loadProgress(selectedId);
      }
    }, [selectedId, loadProgress])
  );

  const bwChartData = bodyWeights.map((p) => ({
    value: p.weight,
    label: parseSqliteDate(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  const bwStats = useMemo(() => {
    if (bodyWeights.length === 0) return null;
    const current = bodyWeights[bodyWeights.length - 1].weight;
    const starting = bodyWeights[0].weight;
    return { current, starting, change: current - starting };
  }, [bodyWeights]);

  const chartData = points.map((p) => ({
    value: metric === 'weight' ? p.max_weight : p.volume,
    label: parseSqliteDate(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((p) => (metric === 'weight' ? p.max_weight : p.volume));
    const current = values[values.length - 1];
    const best = Math.max(...values);
    const change = current - values[0];
    return { current, best, change };
  }, [points, metric]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillRow}
        contentContainerStyle={styles.pillRowContent}
      >
        <Pressable onPress={() => setSelectedId('bodyweight')}>
          {selectedId === 'bodyweight' ? (
            <View style={[styles.pill, styles.pillActive]}>
              <Ionicons name="scale-outline" size={13} color="#fff" style={styles.pillIcon} />
              <Text style={styles.pillTextActive}>Body Weight</Text>
            </View>
          ) : (
            <BlurView intensity={30} tint="dark" style={styles.pill}>
              <Ionicons name="scale-outline" size={13} color="#ccc" style={styles.pillIcon} />
              <Text style={styles.pillText}>Body Weight</Text>
            </BlurView>
          )}
        </Pressable>
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

      {selectedId === 'bodyweight' ? (
        <ScrollView contentContainerStyle={styles.bwScrollContent}>
          <View style={styles.chartCardWrap}>
            <BlurView intensity={40} tint="dark" style={styles.chartCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 1 }}
                style={styles.chartCardSheen}
              />

              <View style={styles.bwInputRow}>
                <TextInput
                  style={styles.bwInput}
                  placeholder="Log today's weight (kg)"
                  placeholderTextColor="#777"
                  keyboardType="decimal-pad"
                  value={bwInput}
                  onChangeText={setBwInput}
                />
                <Pressable style={styles.bwAddButton} onPress={addBodyWeight}>
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>

              {bwStats ? (
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{bwStats.current}</Text>
                    <Text style={styles.statLabel}>Current (kg)</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{bwStats.starting}</Text>
                    <Text style={styles.statLabel}>Starting (kg)</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, bwStats.change <= 0 ? styles.statPositive : styles.statNegative]}>
                      {bwStats.change >= 0 ? '+' : ''}
                      {Math.round(bwStats.change * 10) / 10}
                    </Text>
                    <Text style={styles.statLabel}>Change (kg)</Text>
                  </View>
                </View>
              ) : null}

              {bwChartData.length < 2 ? (
                <Text style={styles.emptySubtitle}>Log at least 2 entries to see a trend.</Text>
              ) : (
                <LineChart
                  data={bwChartData}
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
                  spacing={Math.max(40, 260 / bwChartData.length)}
                  yAxisTextStyle={{ color: '#888' }}
                  xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
                  yAxisColor="rgba(255,255,255,0.1)"
                  xAxisColor="rgba(255,255,255,0.1)"
                  hideRules
                />
              )}
            </BlurView>
          </View>

          {bodyWeights.length > 0 ? (
            <View style={styles.bwEntriesWrap}>
              <Text style={styles.bwEntriesTitle}>Recent Entries</Text>
              {bodyWeights
                .slice()
                .reverse()
                .slice(0, 8)
                .map((entry) => (
                  <View key={entry.id} style={styles.bwEntryRow}>
                    <Text style={styles.bwEntryDate}>
                      {parseSqliteDate(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text style={styles.bwEntryWeight}>{entry.weight} kg</Text>
                    <Pressable onPress={() => deleteBodyWeight(entry)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color="#888" />
                    </Pressable>
                  </View>
                ))}
            </View>
          ) : null}
        </ScrollView>
      ) : exercises.length === 0 ? (
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

            <View style={styles.metricToggle}>
              <Pressable
                style={[styles.metricPill, metric === 'weight' && styles.metricPillActive]}
                onPress={() => setMetric('weight')}
              >
                <Text style={[styles.metricPillText, metric === 'weight' && styles.metricPillTextActive]}>
                  Weight
                </Text>
              </Pressable>
              <Pressable
                style={[styles.metricPill, metric === 'volume' && styles.metricPillActive]}
                onPress={() => setMetric('volume')}
              >
                <Text style={[styles.metricPillText, metric === 'volume' && styles.metricPillTextActive]}>
                  Volume
                </Text>
              </Pressable>
            </View>

            {stats ? (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(stats.current)}</Text>
                  <Text style={styles.statLabel}>Current (kg)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(stats.best)}</Text>
                  <Text style={styles.statLabel}>Best (kg)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, stats.change >= 0 ? styles.statPositive : styles.statNegative]}>
                    {stats.change >= 0 ? '+' : ''}
                    {Math.round(stats.change)}
                  </Text>
                  <Text style={styles.statLabel}>Change (kg)</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.chartTitle}>
              {metric === 'weight' ? 'Top set weight per workout' : 'Total volume per workout'}
            </Text>
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
  bwScrollContent: { paddingBottom: 40 },
  bwInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 20 },
  bwInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bwAddButton: {
    backgroundColor: RED,
    borderRadius: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bwEntriesWrap: { marginHorizontal: 20, marginTop: 4 },
  bwEntriesTitle: { color: '#999', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  bwEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bwEntryDate: { color: '#999', fontSize: 13, flex: 1 },
  bwEntryWeight: { color: '#fff', fontSize: 13, fontWeight: '700', marginRight: 16 },
  pillRow: { maxHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  pillRowContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  pillIcon: { marginRight: 6 },
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

  metricToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metricPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18 },
  metricPillActive: { backgroundColor: RED },
  metricPillText: { color: '#999', fontSize: 12, fontWeight: '700' },
  metricPillTextActive: { color: '#fff' },

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
