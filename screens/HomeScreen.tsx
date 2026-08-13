import { useCallback, useMemo, useState } from 'react';
import { View, Pressable, FlatList, Modal, Image, ScrollView, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Exercise, Routine } from '../types';
import { FONT_BOLD } from '../theme/typography';
import { parseSqliteDate } from '../utils/date';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HEATMAP_WEEKS = 10;
const HEATMAP_DAYS = HEATMAP_WEEKS * 7;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [builderVisible, setBuilderVisible] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [sessionDates, setSessionDates] = useState<string[]>([]);

  const loadRoutines = useCallback(async () => {
    const rows = await db.getAllAsync<Routine>('SELECT * FROM routines ORDER BY name ASC');
    setRoutines(rows);
  }, [db]);

  const loadLibrary = useCallback(async () => {
    const rows = await db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name ASC');
    setLibrary(rows);
  }, [db]);

  const loadSessionDates = useCallback(async () => {
    const rows = await db.getAllAsync<{ date: string }>('SELECT date FROM sessions');
    setSessionDates(rows.map((r) => r.date));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
      loadLibrary();
      loadSessionDates();
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [loadRoutines, loadLibrary, loadSessionDates])
  );

  const activeDays = useMemo(() => new Set(sessionDates.map((d) => dayKey(parseSqliteDate(d)))), [sessionDates]);

  const heatmapColumns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: Date; active: boolean }[] = [];
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ date: d, active: activeDays.has(dayKey(d)) });
    }
    const columns: { date: Date; active: boolean }[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      columns.push(days.slice(i, i + 7));
    }
    return columns;
  }, [activeDays]);

  const streak = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(today);
    if (!activeDays.has(dayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    let count = 0;
    while (activeDays.has(dayKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [activeDays]);

  async function startWorkout() {
    const result = await db.runAsync("INSERT INTO sessions (date) VALUES (datetime('now'))");
    navigation.navigate('ActiveWorkout', { sessionId: result.lastInsertRowId });
  }

  async function startRoutine(routine: Routine) {
    const result = await db.runAsync(
      "INSERT INTO sessions (date, name) VALUES (datetime('now'), ?)",
      routine.name
    );
    navigation.navigate('ActiveWorkout', {
      sessionId: result.lastInsertRowId,
      routineId: routine.id,
      initialName: routine.name,
    });
  }

  function toggleExercise(id: number) {
    setSelectedExerciseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function openBuilder() {
    setRoutineName('');
    setSelectedExerciseIds([]);
    setBuilderVisible(true);
  }

  async function saveRoutine() {
    if (!routineName.trim() || selectedExerciseIds.length === 0) return;
    const result = await db.runAsync('INSERT INTO routines (name) VALUES (?)', routineName.trim());
    const routineId = result.lastInsertRowId;
    for (let i = 0; i < selectedExerciseIds.length; i++) {
      await db.runAsync(
        'INSERT INTO routine_exercises (routine_id, exercise_id, position) VALUES (?, ?, ?)',
        routineId,
        selectedExerciseIds[i],
        i + 1
      );
    }
    setBuilderVisible(false);
    loadRoutines();
  }

  async function deleteRoutine(routine: Routine) {
    await db.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', routine.id);
    await db.runAsync('DELETE FROM routines WHERE id = ?', routine.id);
    loadRoutines();
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <View style={styles.heroImageClip}>
            <Image
              source={require('../assets/images/sideview-sando-black.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['#0d0d0d', 'rgba(13,13,13,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroImageTopFade}
            />
          </View>
          <LinearGradient
            colors={['#0d0d0d', 'rgba(13,13,13,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.heroImageFade}
          />

          <View style={styles.heroText}>
            <Text style={styles.headline}>Stay Healthy</Text>
            <Text style={styles.headline}>Keep Body</Text>
            <View style={styles.strongPill}>
              <Text style={styles.strongPillText}>Strong</Text>
            </View>
          </View>

          <View style={styles.statPills}>
            <View style={styles.statPillWrap}>
              <BlurView intensity={45} tint="dark" style={styles.statPill}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.7, y: 1 }}
                  style={styles.statPillSheen}
                />
                <View style={styles.statIconCircle}>
                  <Ionicons name="flame" size={16} color="#fff" />
                </View>
                <Text style={styles.statPillText}>Kcal</Text>
              </BlurView>
            </View>
            <View style={[styles.statPillWrap, styles.statPillIndent]}>
              <BlurView intensity={45} tint="dark" style={styles.statPill}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.7, y: 1 }}
                  style={styles.statPillSheen}
                />
                <View style={styles.statIconCircle}>
                  <Ionicons name="heart" size={16} color="#fff" />
                </View>
                <Text style={styles.statPillText}>bpm</Text>
              </BlurView>
            </View>
            <View style={styles.statPillWrap}>
              <BlurView intensity={45} tint="dark" style={styles.statPill}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.7, y: 1 }}
                  style={styles.statPillSheen}
                />
                <View style={styles.statIconCircle}>
                  <Ionicons name="pulse" size={16} color="#fff" />
                </View>
                <Text style={styles.statPillText}>Pulse</Text>
              </BlurView>
            </View>
          </View>
        </View>

        <View style={styles.startButtonWrap}>
          <Pressable style={styles.startButton} onPress={startWorkout}>
            <Text style={styles.startButtonText}>Start Workout</Text>
          </Pressable>
        </View>

        <View style={styles.pulseCardWrap}>
          <BlurView intensity={40} tint="dark" style={styles.pulseCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 1 }}
              style={styles.pulseCardSheen}
            />
            <View style={styles.pulseCardTop}>
              <Text style={styles.pulseCardLabel}>Workout Streak</Text>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color="#f5b942" />
                <Text style={styles.streakBadgeText}>{streak}</Text>
              </View>
            </View>

            <Text style={styles.streakSubtitle}>
              {streak === 0
                ? 'Log a workout today to start a streak.'
                : `${streak} day${streak === 1 ? '' : 's'} in a row. Keep it going.`}
            </Text>

            <View style={styles.heatmapWrap}>
              {heatmapColumns.map((column, colIndex) => (
                <View key={colIndex} style={styles.heatmapColumn}>
                  {column.map((day, rowIndex) => (
                    <View
                      key={rowIndex}
                      style={[styles.heatmapCell, day.active ? styles.heatmapCellActive : styles.heatmapCellInactive]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </BlurView>
        </View>

        <View style={styles.section}>
          <View style={styles.routinesHeaderRow}>
            <Text style={styles.sectionTitle}>Routines</Text>
            <Pressable onPress={openBuilder}>
              <Text style={styles.newRoutineLink}>+ New Routine</Text>
            </Pressable>
          </View>

          {routines.length === 0 ? (
            <Text style={styles.empty}>No routines yet. Create one to start workouts faster.</Text>
          ) : (
            routines.map((item) => (
              <View key={item.id} style={styles.routineRowWrap}>
                <BlurView intensity={30} tint="dark" style={styles.routineRow}>
                  <Pressable style={styles.routineInfo} onPress={() => startRoutine(item)}>
                    <View style={styles.routineIconCircle}>
                      <Ionicons name="barbell" size={16} color="#fff" />
                    </View>
                    <Text style={styles.routineName}>{item.name}</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteRoutine(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#888" />
                  </Pressable>
                </BlurView>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={builderVisible} animationType="slide" onRequestClose={() => setBuilderVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>New Routine</Text>
          <TextInput
            style={styles.input}
            placeholder="Routine name (e.g. Push Day)"
            placeholderTextColor="#777"
            value={routineName}
            onChangeText={setRoutineName}
          />
          <Text style={styles.modalSubtitle}>Select exercises</Text>
          <FlatList
            data={library}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const selected = selectedExerciseIds.includes(item.id);
              return (
                <Pressable style={styles.modalRow} onPress={() => toggleExercise(item.id)}>
                  <Text style={[styles.modalRowText, selected && styles.modalRowTextSelected]}>
                    {selected ? '✓ ' : ''}
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>Add exercises in the Exercises tab first.</Text>}
          />
          <View style={styles.modalActions}>
            <Pressable style={styles.modalCancel} onPress={() => setBuilderVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.modalSave} onPress={saveRoutine}>
              <Text style={styles.modalSaveText}>Save Routine</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const RED = '#e5484d';
const BORDER = 'rgba(255,255,255,0.08)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  scrollContent: { paddingBottom: 60 },

  hero: { position: 'relative', minHeight: 470, paddingHorizontal: 24, overflow: 'hidden' },
  heroImageClip: {
    position: 'absolute',
    right: -40,
    bottom: 0,
    width: '66%',
    height: 360,
    borderTopLeftRadius: 90,
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: 430, marginTop: -6 },
  // Just a light feather on the clip's own top edge — kept small so it
  // doesn't shadow the face.
  heroImageTopFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 16 },
  heroImageFade: { position: 'absolute', right: '34%', bottom: 0, width: 130, height: 360 },

  heroText: { gap: 2 },
  headline: { fontSize: 42, fontFamily: FONT_BOLD, color: '#fff', lineHeight: 46 },
  strongPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: RED,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 30,
  },
  strongPillText: { fontSize: 36, fontFamily: FONT_BOLD, color: '#fff' },

  statPills: { marginTop: 44, gap: 18 },
  statPillWrap: {
    alignSelf: 'flex-start',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  statPillIndent: { marginLeft: 28 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 30,
    paddingVertical: 6,
    paddingRight: 20,
    paddingLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  statPillSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%' },
  statIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  statPillText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  startButtonWrap: { marginTop: -36, marginHorizontal: 20 },

  pulseCardWrap: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  pulseCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
  },
  pulseCardSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  pulseCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseCardLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245,185,66,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(245,185,66,0.3)',
  },
  streakBadgeText: { color: '#f5b942', fontSize: 15, fontWeight: '800' },
  streakSubtitle: { color: '#999', fontSize: 13, marginTop: 8 },

  heatmapWrap: { flexDirection: 'row', gap: 4, marginTop: 20 },
  heatmapColumn: { gap: 4 },
  heatmapCell: { width: 12, height: 12, borderRadius: 3 },
  heatmapCellActive: { backgroundColor: RED },
  heatmapCellInactive: { backgroundColor: 'rgba(255,255,255,0.08)' },

  section: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  startButton: {
    backgroundColor: RED,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  routinesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  newRoutineLink: { color: RED, fontWeight: '600' },
  routineRowWrap: {
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  routineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  routineInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  routineIconCircle: {
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
  routineName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  empty: { textAlign: 'center', color: '#777', marginTop: 12 },

  modalContainer: { flex: 1, paddingTop: 60, paddingHorizontal: 16, backgroundColor: '#0d0d0d' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    color: '#fff',
    backgroundColor: '#161616',
  },
  modalSubtitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 8, textTransform: 'uppercase' },
  modalRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  modalRowText: { fontSize: 16, color: '#ccc' },
  modalRowTextSelected: { color: '#fff', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  modalCancelText: { color: '#ccc', fontWeight: '600' },
  modalSave: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: RED },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
