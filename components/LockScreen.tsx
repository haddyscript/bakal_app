import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Text from './Text';

interface Props {
  authenticating: boolean;
  onRetry: () => void;
}

export default function LockScreen({ authenticating, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BAKAL</Text>
      {authenticating ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.message}>Unlock with Face ID to continue</Text>
          <Pressable style={styles.button} onPress={onRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 20 },
  title: { fontSize: 32, fontWeight: '700' },
  message: { fontSize: 15, color: '#666' },
  button: { backgroundColor: '#111', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
