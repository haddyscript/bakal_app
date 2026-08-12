import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Modal, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Exercise, WorkoutSet } from '../types';

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
  const { sessionId } = route.params;

  const [library, setLibrary] = useState<Exercise[]>([]);
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [inputs, setInputs] = useState<Record<number, { weight: string; reps: string }>>({});

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

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

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
  }

  async function finishWorkout() {
    await db.runAsync(
      "UPDATE sessions SET duration_seconds = CAST((julianday('now') - julianday(date)) * 86400 AS INTEGER) WHERE id = ?",
      sessionId
    );
    navigation.popToTop();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={blocks}
        keyExtractor={(item) => String(item.exercise.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{item.exercise.name}</Text>
            {item.sets.map((s) => (
              <Text key={s.id} style={styles.setRow}>
                Set {s.set_order}: {s.weight} kg x {s.reps}
              </Text>
            ))}
            <View style={styles.setForm}>
              <TextInput
                style={styles.setInput}
                placeholder="Weight"
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
                <Text style={styles.setAddButtonText}>Add Set</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Pressable style={styles.addExerciseButton} onPress={() => setPickerVisible(true)}>
            <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
          </Pressable>
        }
      />
      <Pressable style={styles.finishButton} onPress={finishWorkout}>
        <Text style={styles.finishButtonText}>Finish Workout</Text>
      </Pressable>

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Pick an exercise</Text>
          <FlatList
            data={library}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable style={styles.modalRow} onPress={() => addExerciseToWorkout(item)}>
                <Text style={styles.modalRowText}>{item.name}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>No exercises in your library yet. Add some from the Exercises tab.</Text>
            }
          />
          <Pressable style={styles.modalClose} onPress={() => setPickerVisible(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, gap: 16 },
  block: { gap: 6, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  blockTitle: { fontSize: 17, fontWeight: '700' },
  setRow: { fontSize: 14, color: '#333' },
  setForm: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
  setInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  setAddButton: { backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  setAddButtonText: { color: '#fff', fontWeight: '600' },
  addExerciseButton: {
    borderWidth: 1,
    borderColor: '#111',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addExerciseButtonText: { color: '#111', fontWeight: '600' },
  finishButton: { backgroundColor: '#111', margin: 16, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalContainer: { flex: 1, paddingTop: 60, paddingHorizontal: 16, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  modalRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  modalRowText: { fontSize: 16 },
  modalClose: { paddingVertical: 16, alignItems: 'center' },
  modalCloseText: { color: '#111', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', marginTop: 32 },
});
