import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<Nav>();

  async function startWorkout() {
    const result = await db.runAsync("INSERT INTO sessions (date) VALUES (datetime('now'))");
    navigation.navigate('ActiveWorkout', { sessionId: result.lastInsertRowId });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BAKAL</Text>
      <Pressable style={styles.button} onPress={startWorkout}>
        <Text style={styles.buttonText}>Start Workout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 24 },
  title: { fontSize: 32, fontWeight: '700' },
  button: { backgroundColor: '#111', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
