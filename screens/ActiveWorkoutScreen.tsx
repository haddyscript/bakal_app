import { useCallback, useEffect, useState } from 'react';
import { View, Pressable, FlatList, Modal, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { setStatusBarStyle } from 'expo-status-bar';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Exercise, WorkoutSet } from '../types';
import { useRestTimer } from '../hooks/useRestTimer';
import RestTimer from '../components/RestTimer';
import { FONT_BOLD, FONT_SEMIBOLD } from '../theme/typography';

const DEFAULT_REST_SECONDS = 90;
const RED = '#e5484d';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ActiveWorkout'>;
type Route = RouteProp<RootStackParamList, 'ActiveWorkout'>;

interface ExerciseBlock {
  exercise: Exercise;
  sets: WorkoutSet[];
}

export default function ActiveWorkoutScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionId, routineId, initialName } = route.params;

  const [library, setLibrary] = useState<Exercise[]>([]);
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [inputs, setInputs] = useState<Record<number, { weight: string; reps: string }>>({});
  const [workoutName, setWorkoutName] = useState(initialName ?? '');
  const restTimer = useRestTimer();

  async function saveWorkoutName() {
    await db.runAsync('UPDATE sessions SET name = ? WHERE id = ?', workoutName.trim() || null, sessionId);
  }

  const loadLibrary = useCallback(async () => {
    const rows = await db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name ASC');
    setLibrary(rows);
  }, [db]);

  const loadSets = useCallback(async () => {
    const rows = await db.getAllAsync<WorkoutSet>(
      'SELECT * FROM sets WHERE session_id = ? ORDER BY set_order ASC',
      sessionId
    );
    setBlocks((prev) => {
      const byExercise = new Map<number, WorkoutSet[]>();
      for (const s of rows) {
        const list = byExercise.get(s.exercise_id) ?? [];
        list.push(s);
        byExercise.set(s.exercise_id, list);
      }
      return prev.map((b) => ({ ...b, sets: byExercise.get(b.exercise.id) ?? [] }));
    });
  }, [db, sessionId]);

  const loadRoutineExercises = useCallback(
    async (id: number) => {
      const rows = await db.getAllAsync<Exercise>(
        `SELECT exercises.* FROM routine_exercises
         JOIN exercises ON exercises.id = routine_exercises.exercise_id
         WHERE routine_exercises.routine_id = ?
         ORDER BY routine_exercises.position ASC`,
        id
      );
      setBlocks(rows.map((exercise) => ({ exercise, sets: [] })));
      setInputs(Object.fromEntries(rows.map((exercise) => [exercise.id, { weight: '', reps: '' }])));
    },
    [db]
  );

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (routineId != null) {
      loadRoutineExercises(routineId);
    }
  }, [routineId, loadRoutineExercises]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [])
  );

  function addExerciseToWorkout(exercise: Exercise) {
    setPickerVisible(false);
    setBlocks((prev) =>
      prev.some((b) => b.exercise.id === exercise.id) ? prev : [...prev, { exercise, sets: [] }]
    );
    setInputs((prev) => ({ ...prev, [exercise.id]: { weight: '', reps: '' } }));
  }

  async function addSet(exercise: Exercise) {
    const input = inputs[exercise.id];
    const weight = parseFloat(input?.weight ?? '');
    const reps = parseInt(input?.reps ?? '', 10);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return;

    const currentBlock = blocks.find((b) => b.exercise.id === exercise.id);
    const nextOrder = (currentBlock?.sets.length ?? 0) + 1;

    await db.runAsync(
      'INSERT INTO sets (session_id, exercise_id, weight, reps, set_order) VALUES (?, ?, ?, ?, ?)',
      sessionId,
      exercise.id,
      weight,
      reps,
      nextOrder
    );
    setInputs((prev) => ({ ...prev, [exercise.id]: { weight: '', reps: '' } }));
    loadSets();
    restTimer.start(DEFAULT_REST_SECONDS);
  }

  async function finishWorkout() {
    await restTimer.stop();
    await saveWorkoutName();
    await db.runAsync(
      "UPDATE sessions SET duration_seconds = CAST((julianday('now') - julianday(date)) * 86400 AS INTEGER) WHERE id = ?",
      sessionId
    );
    navigation.popToTop();
  }

  return (
    <View style={styles.container}>
      <View style={styles.nameField}>
        <Ionicons name="pencil" size={16} color="#666" />
        <TextInput
          style={styles.nameInput}
          placeholder="Name this workout (e.g. Chest and Bicep Day)"
          placeholderTextColor="#666"
          value={workoutName}
          onChangeText={setWorkoutName}
          onEndEditing={saveWorkoutName}
        />
      </View>
      <FlatList
        data={blocks}
        keyExtractor={(item) => String(item.exercise.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.blockWrap}>
            <BlurView intensity={30} tint="dark" style={styles.block}>
              <View style={styles.blockHeader}>
                <View style={styles.blockIconCircle}>
                  <Ionicons name="barbell" size={16} color="#fff" />
                </View>
                <Text style={styles.blockTitle}>{item.exercise.name}</Text>
              </View>

              {item.sets.map((s) => (
                <View key={s.id} style={styles.setRow}>
                  <Text style={styles.setLabel}>Set {s.set_order}</Text>
                  <Text style={styles.setValue}>
                    {s.weight} kg <Text style={styles.setValueMuted}>×</Text> {s.reps}
                  </Text>
                </View>
              ))}

              <View style={styles.setForm}>
                <TextInput
                  style={styles.setInput}
                  placeholder="Weight"
                  placeholderTextColor="#777"
                  keyboardType="decimal-pad"
                  value={inputs[item.exercise.id]?.weight ?? ''}
                  onChangeText={(v) =>
                    setInputs((prev) => ({
                      ...prev,
                      [item.exercise.id]: { weight: v, reps: prev[item.exercise.id]?.reps ?? '' },
                    }))
                  }
                />
                <TextInput
                  style={styles.setInput}
                  placeholder="Reps"
                  placeholderTextColor="#777"
                  keyboardType="number-pad"
                  value={inputs[item.exercise.id]?.reps ?? ''}
                  onChangeText={(v) =>
                    setInputs((prev) => ({
                      ...prev,
                      [item.exercise.id]: { weight: prev[item.exercise.id]?.weight ?? '', reps: v },
                    }))
                  }
                />
                <Pressable style={styles.setAddButton} onPress={() => addSet(item.exercise)}>
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>
            </BlurView>
          </View>
        )}
        ListFooterComponent={
          <Pressable style={styles.addExerciseButton} onPress={() => setPickerVisible(true)}>
            <Ionicons name="add-circle-outline" size={18} color={RED} />
            <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="barbell-outline" size={36} color="#444" />
            <Text style={styles.empty}>No exercises added yet</Text>
            <Text style={styles.emptySubtitle}>Tap "Add Exercise" below to get started.</Text>
          </View>
        }
      />
      <RestTimer
        secondsLeft={restTimer.secondsLeft}
        running={restTimer.running}
        onStart={(seconds) => restTimer.start(seconds)}
        onStop={() => restTimer.stop()}
      />

      <Pressable style={styles.finishButton} onPress={finishWorkout}>
        <Text style={styles.finishButtonText}>Finish Workout</Text>
      </Pressable>

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pick an exercise</Text>
            <Pressable onPress={() => setPickerVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          <FlatList
            data={library}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <View style={styles.modalRowWrap}>
                <BlurView intensity={30} tint="dark" style={styles.modalRow}>
                  <Pressable style={styles.modalRowInner} onPress={() => addExerciseToWorkout(item)}>
                    <View style={styles.modalRowIconCircle}>
                      <Ionicons name="barbell" size={16} color="#fff" />
                    </View>
                    <View>
                      <Text style={styles.modalRowText}>{item.name}</Text>
                      {item.muscle_group ? <Text style={styles.modalRowSubtitle}>{item.muscle_group}</Text> : null}
                    </View>
                  </Pressable>
                </BlurView>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>No exercises in your library yet. Add some from the Exercises tab.</Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  nameField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  nameInput: { flex: 1, color: '#fff', fontSize: 17, fontFamily: FONT_SEMIBOLD },
  list: { padding: 20, gap: 12, paddingBottom: 12 },
  blockWrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  block: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  blockIconCircle: {
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
  blockTitle: { fontSize: 16, fontFamily: FONT_SEMIBOLD, color: '#fff' },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  setLabel: { color: '#999', fontSize: 13 },
  setValue: { color: '#fff', fontSize: 13, fontFamily: FONT_SEMIBOLD },
  setValueMuted: { color: '#666' },
  setForm: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  setAddButton: {
    backgroundColor: RED,
    borderRadius: 8,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.5)',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  addExerciseButtonText: { color: RED, fontFamily: FONT_SEMIBOLD },
  finishButton: {
    backgroundColor: RED,
    margin: 20,
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  finishButtonText: { color: '#fff', fontSize: 16, fontFamily: FONT_BOLD },

  emptyWrap: { alignItems: 'center', marginTop: 40, gap: 8 },
  empty: { textAlign: 'center', color: '#999', fontSize: 15, fontFamily: FONT_SEMIBOLD, marginTop: 4 },
  emptySubtitle: { textAlign: 'center', color: '#666', fontSize: 13 },

  modalContainer: { flex: 1, paddingTop: 60, paddingHorizontal: 16, backgroundColor: '#0d0d0d' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: FONT_BOLD, color: '#fff' },
  modalList: { paddingBottom: 24 },
  modalRowWrap: {
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  modalRow: { backgroundColor: 'rgba(255,255,255,0.05)' },
  modalRowInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  modalRowIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  modalRowText: { fontSize: 15, fontFamily: FONT_SEMIBOLD, color: '#fff' },
  modalRowSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
});
