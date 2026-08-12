import { useCallback, useState } from 'react';
import { View, Pressable, FlatList, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import type { Exercise } from '../types';

const RED = '#e5484d';

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
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
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
      <View style={styles.formWrap}>
        <BlurView intensity={40} tint="dark" style={styles.form}>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            style={styles.formSheen}
          />
          <TextInput
            style={styles.input}
            placeholder="Exercise name"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Muscle group (optional)"
            placeholderTextColor="#777"
            value={muscleGroup}
            onChangeText={setMuscleGroup}
          />
          <Pressable style={styles.addButton} onPress={addExercise}>
            <Text style={styles.addButtonText}>Add Exercise</Text>
          </Pressable>
        </BlurView>
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <BlurView intensity={30} tint="dark" style={styles.row}>
              <View style={styles.iconCircle}>
                <Ionicons name="barbell" size={16} color="#fff" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                {item.muscle_group ? <Text style={styles.rowSubtitle}>{item.muscle_group}</Text> : null}
              </View>
            </BlurView>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="barbell-outline" size={36} color="#444" />
            <Text style={styles.empty}>No exercises yet</Text>
            <Text style={styles.emptySubtitle}>Add your first one above.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },

  formWrap: {
    margin: 20,
    marginBottom: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  form: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 18, gap: 10 },
  formSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  addButton: { backgroundColor: RED, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  list: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  rowWrap: {
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconCircle: {
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
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  rowSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },

  emptyWrap: { alignItems: 'center', marginTop: 40, gap: 8 },
  empty: { textAlign: 'center', color: '#999', fontSize: 15, fontWeight: '600' },
  emptySubtitle: { textAlign: 'center', color: '#666', fontSize: 13 },
});
