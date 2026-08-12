import { View, Pressable, StyleSheet } from 'react-native';
import Text from './Text';

interface Props {
  secondsLeft: number;
  running: boolean;
  onStart: (seconds: number) => void;
  onStop: () => void;
}

const PRESETS = [60, 90, 120];

export default function RestTimer({ secondsLeft, running, onStart, onStop }: Props) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Rest Timer</Text>
      {running ? (
        <>
          <Text style={styles.clock}>
            {mins}:{secs.toString().padStart(2, '0')}
          </Text>
          <Pressable style={styles.stopButton} onPress={onStop}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <Pressable key={p} style={styles.presetButton} onPress={() => onStart(p)}>
              <Text style={styles.presetButtonText}>{p}s</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    gap: 8,
  },
  label: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase' },
  clock: { fontSize: 32, fontWeight: '700' },
  stopButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: '#111' },
  stopButtonText: { color: '#fff', fontWeight: '600' },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#111' },
  presetButtonText: { color: '#fff', fontWeight: '600' },
});
