import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Text from './Text';
import { FONT_BOLD, FONT_SEMIBOLD } from '../theme/typography';

interface Props {
  secondsLeft: number;
  running: boolean;
  onStart: (seconds: number) => void;
  onStop: () => void;
}

const PRESETS = [60, 90, 120];
const RED = '#e5484d';

export default function RestTimer({ secondsLeft, running, onStart, onStop }: Props) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <View style={styles.wrap}>
      <BlurView intensity={35} tint="dark" style={styles.container}>
        <View style={styles.labelRow}>
          <Ionicons name="timer-outline" size={14} color="#999" />
          <Text style={styles.label}>Rest Timer</Text>
        </View>
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
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  container: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, alignItems: 'center', gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 12, fontFamily: FONT_SEMIBOLD, color: '#999', textTransform: 'uppercase' },
  clock: { fontSize: 32, fontFamily: FONT_BOLD, color: RED },
  stopButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: RED },
  stopButtonText: { color: '#fff', fontFamily: FONT_SEMIBOLD },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  presetButtonText: { color: '#fff', fontFamily: FONT_SEMIBOLD },
});
