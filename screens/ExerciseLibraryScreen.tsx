import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import type { Exercise } from '../types';

export default function ExerciseLibraryScreen() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');

  const loadExercises = useCallback(async () => {
    const rows = await db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name ASC');
    setExercises(rows);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  async function addExercise() {
    if (!name.trim()) return;
    await db.runAsync(
      'INSERT INTO exercises (name, muscle_group) VALUES (?, ?)',
      name.trim(),
      muscleGroup.trim() || null
    );
    setName('');
    setMuscleGroup('');
    loadExercises();
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Exercise name" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="Muscle group (optional)"
          value={muscleGroup}
          onChangeText={setMuscleGroup}
        />
        <Pressable style={styles.addButton} onPress={addExercise}>
          <Text style={styles.addButtonText}>Add Exercise</Text>
        </Pressable>
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            {item.muscle_group ? <Text style={styles.rowSubtitle}>{item.muscle_group}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No exercises yet. Add one above.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 16, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  addButton: { backgroundColor: '#111', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, gap: 4 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#666' },
  empty: { textAlign: 'center', color: '#999', marginTop: 32 },
});
