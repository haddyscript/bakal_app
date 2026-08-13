import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { parseSqliteDate } from '../utils/date';

interface SetRow {
  set_id: number;
  exercise_id: number;
  weight: number;
  reps: number;
  set_order: number;
  exercise_name: string;
}

interface ExerciseGroup {
  exerciseName: string;
  sets: SetRow[];
}

interface SessionInfo {
  date: string;
  duration_seconds: number | null;
  name: string | null;
  notes: string | null;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SessionDetail'>;

const RED = '#e5484d';

export default function SessionDetailScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionId } = route.params;
  const [rows, setRows] = useState<SetRow[]>([]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    (async () => {
      const sessionRow = await db.getFirstAsync<SessionInfo>(
        'SELECT date, duration_seconds, name, notes FROM sessions WHERE id = ?',
        sessionId
      );
      setSession(sessionRow ?? null);
      setNotesDraft(sessionRow?.notes ?? '');

      const joinedSets = await db.getAllAsync<SetRow>(
        `SELECT sets.id as set_id, sets.exercise_id, sets.weight, sets.reps, sets.set_order, exercises.name as exercise_name
         FROM sets
         JOIN exercises ON exercises.id = sets.exercise_id
         WHERE sets.session_id = ?
         ORDER BY exercises.name ASC, sets.set_order ASC`,
        sessionId
      );
      setRows(joinedSets);
    })();
  }, [db, sessionId]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [])
  );

  const groups = useMemo<ExerciseGroup[]>(() => {
    const map = new Map<string, SetRow[]>();
    for (const row of rows) {
      const list = map.get(row.exercise_name) ?? [];
      list.push(row);
      map.set(row.exercise_name, list);
    }
    return Array.from(map.entries()).map(([exerciseName, sets]) => ({ exerciseName, sets }));
  }, [rows]);

  const totalVolume = useMemo(() => rows.reduce((sum, r) => sum + r.weight * r.reps, 0), [rows]);

  const date = session ? parseSqliteDate(session.date) : null;

  async function saveNotes() {
    await db.runAsync('UPDATE sessions SET notes = ? WHERE id = ?', notesDraft.trim() || null, sessionId);
  }

  async function repeatWorkout() {
    if (groups.length === 0) return;
    const prefill = groups.map((g) => {
      const last = g.sets[g.sets.length - 1];
      return { exerciseId: last.exercise_id, weight: last.weight, reps: last.reps };
    });
    const result = await db.runAsync("INSERT INTO sessions (date, name) VALUES (datetime('now'), ?)", session?.name ?? null);
    navigation.navigate('ActiveWorkout', {
      sessionId: result.lastInsertRowId,
      initialName: session?.name ?? undefined,
      prefill,
    });
  }

  return (
    <View style={styles.container}>
      {date ? (
        <View style={styles.summaryWrap}>
          <BlurView intensity={40} tint="dark" style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 1 }}
              style={styles.summarySheen}
            />
            <Text style={styles.summaryDate}>
              {session?.name || date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
            <Text style={styles.summaryTime}>
              {session?.name
                ? `${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} · `
                : ''}
              {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Text>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{groups.length}</Text>
                <Text style={styles.summaryStatLabel}>Exercises</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{rows.length}</Text>
                <Text style={styles.summaryStatLabel}>Sets</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{Math.round(totalVolume)}</Text>
                <Text style={styles.summaryStatLabel}>Volume (kg)</Text>
              </View>
              {session?.duration_seconds ? (
                <>
                  <View style={styles.summaryStatDivider} />
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatValue}>{Math.round(session.duration_seconds / 60)}</Text>
                    <Text style={styles.summaryStatLabel}>Minutes</Text>
                  </View>
                </>
              ) : null}
            </View>
          </BlurView>
        </View>
      ) : null}

      {date ? (
        <View style={styles.notesWrap}>
          <BlurView intensity={30} tint="dark" style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={16} color="#999" />
              <Text style={styles.notesLabel}>Notes</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Add notes about this workout..."
              placeholderTextColor="#666"
              value={notesDraft}
              onChangeText={setNotesDraft}
              onEndEditing={saveNotes}
              multiline
            />
          </BlurView>
        </View>
      ) : null}

      {rows.length > 0 ? (
        <Pressable style={styles.repeatButton} onPress={repeatWorkout}>
          <Ionicons name="repeat" size={18} color="#fff" />
          <Text style={styles.repeatButtonText}>Repeat this workout</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={groups}
        keyExtractor={(item) => item.exerciseName}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.exerciseCardWrap}>
            <BlurView intensity={30} tint="dark" style={styles.exerciseCard}>
              <View style={styles.exerciseCardHeader}>
                <View style={styles.exerciseIconCircle}>
                  <Ionicons name="barbell" size={16} color="#fff" />
                </View>
                <Text style={styles.exerciseName}>{item.exerciseName}</Text>
              </View>

              {item.sets.map((s) => (
                <View key={s.set_id} style={styles.setRow}>
                  <Text style={styles.setLabel}>Set {s.set_order}</Text>
                  <Text style={styles.setValue}>
                    {s.weight} kg <Text style={styles.setValueMuted}>×</Text> {s.reps}
                  </Text>
                </View>
              ))}
            </BlurView>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="barbell-outline" size={36} color="#444" />
            <Text style={styles.empty}>No sets logged for this session.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },

  summaryWrap: {
    margin: 20,
    marginBottom: 8,
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
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 20 },
  summarySheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  summaryDate: { color: '#fff', fontSize: 20, fontWeight: '800' },
  summaryTime: { color: '#999', fontSize: 14, marginTop: 2 },
  summaryStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryStatValue: { color: RED, fontSize: 20, fontWeight: '800' },
  summaryStatLabel: { color: '#999', fontSize: 11, marginTop: 2, textTransform: 'uppercase' },
  summaryStatDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: 'rgba(255,255,255,0.14)' },

  notesWrap: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  notesCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 14 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  notesLabel: { color: '#999', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  notesInput: { color: '#ccc', fontSize: 14, minHeight: 20 },

  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  repeatButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  list: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  exerciseCardWrap: {
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  exerciseCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16 },
  exerciseCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  exerciseIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  exerciseName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  setLabel: { color: '#999', fontSize: 13 },
  setValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  setValueMuted: { color: '#666' },

  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
  empty: { textAlign: 'center', color: '#999', fontSize: 15, fontWeight: '600' },
});
