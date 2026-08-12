import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Modal, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Exercise, Routine } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<Nav>();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [builderVisible, setBuilderVisible] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);

  const loadRoutines = useCallback(async () => {
    const rows = await db.getAllAsync<Routine>('SELECT * FROM routines ORDER BY name ASC');
    setRoutines(rows);
  }, [db]);

  const loadLibrary = useCallback(async () => {
    const rows = await db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name ASC');
    setLibrary(rows);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
      loadLibrary();
    }, [loadRoutines, loadLibrary])
  );

  async function startWorkout() {
    const result = await db.runAsync("INSERT INTO sessions (date) VALUES (datetime('now'))");
    navigation.navigate('ActiveWorkout', { sessionId: result.lastInsertRowId });
  }

  async function startRoutine(routine: Routine) {
    const result = await db.runAsync("INSERT INTO sessions (date) VALUES (datetime('now'))");
    navigation.navigate('ActiveWorkout', { sessionId: result.lastInsertRowId, routineId: routine.id });
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
    <View style={styles.container}>
      <FlatList
        data={routines}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>BAKAL</Text>
            <Pressable style={styles.button} onPress={startWorkout}>
              <Text style={styles.buttonText}>Start Workout</Text>
            </Pressable>
            <View style={styles.routinesHeaderRow}>
              <Text style={styles.sectionTitle}>Routines</Text>
              <Pressable onPress={openBuilder}>
                <Text style={styles.newRoutineLink}>+ New Routine</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.routineRow}>
            <Pressable style={styles.routineInfo} onPress={() => startRoutine(item)}>
              <Text style={styles.routineName}>{item.name}</Text>
            </Pressable>
            <Pressable onPress={() => deleteRoutine(item)}>
              <Text style={styles.deleteLink}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No routines yet. Create one to start workouts faster.</Text>}
      />

      <Modal visible={builderVisible} animationType="slide" onRequestClose={() => setBuilderVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>New Routine</Text>
          <TextInput
            style={styles.input}
            placeholder="Routine name (e.g. Push Day)"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, gap: 8 },
  header: { alignItems: 'center', gap: 16, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '700' },
  button: {
    backgroundColor: '#111',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  routinesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  newRoutineLink: { color: '#111', fontWeight: '600' },
  routineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  routineInfo: { flex: 1 },
  routineName: { fontSize: 16, fontWeight: '600' },
  deleteLink: { color: '#c33', fontSize: 13 },
  empty: { textAlign: 'center', color: '#999', marginTop: 16 },
  modalContainer: { flex: 1, paddingTop: 60, paddingHorizontal: 16, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  modalSubtitle: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, textTransform: 'uppercase' },
  modalRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  modalRowText: { fontSize: 16, color: '#333' },
  modalRowTextSelected: { color: '#111', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ccc' },
  modalCancelText: { color: '#333', fontWeight: '600' },
  modalSave: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#111' },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
