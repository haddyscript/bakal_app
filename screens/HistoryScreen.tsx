import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { parseSqliteDate } from '../utils/date';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface SessionRow {
  id: number;
  date: string;
  duration_seconds: number | null;
  set_count: number;
  exercise_count: number;
}

const RED = '#e5484d';

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<Nav>();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      db.getAllAsync<SessionRow>(
        `SELECT sessions.id, sessions.date, sessions.duration_seconds,
                COUNT(sets.id) as set_count,
                COUNT(DISTINCT sets.exercise_id) as exercise_count
         FROM sessions
         LEFT JOIN sets ON sets.session_id = sessions.id
         GROUP BY sessions.id
         ORDER BY sessions.date DESC`
      ).then((rows) => {
        if (active) setSessions(rows);
      });
      setStatusBarStyle('light');
      return () => {
        active = false;
        setStatusBarStyle('dark');
      };
    }, [db])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const date = parseSqliteDate(item.date);
          const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          const timeLabel = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          const statsLabel =
            item.exercise_count > 0
              ? `${item.exercise_count} exercise${item.exercise_count === 1 ? '' : 's'} · ${item.set_count} set${item.set_count === 1 ? '' : 's'}`
              : 'No sets logged';

          return (
            <Pressable
              style={styles.cardWrap}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
            >
              <BlurView intensity={40} tint="dark" style={styles.card}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.6, y: 1 }}
                  style={styles.cardSheen}
                />

                <View style={styles.iconCircle}>
                  <Ionicons name="barbell" size={18} color="#fff" />
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardDate}>{dateLabel}</Text>
                  <Text style={styles.cardSubtitle}>
                    {timeLabel} · {statsLabel}
                  </Text>
                </View>

                <View style={styles.cardTrailing}>
                  {item.duration_seconds ? (
                    <View style={styles.durationPill}>
                      <Text style={styles.durationPillText}>{Math.round(item.duration_seconds / 60)} min</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color="#aaa" />
                </View>
              </BlurView>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="barbell-outline" size={36} color="#444" />
            <Text style={styles.empty}>No workouts logged yet.</Text>
            <Text style={styles.emptySubtitle}>Start a workout from Home to see it here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  list: { padding: 20, paddingBottom: 40 },
  cardWrap: {
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    overflow: 'hidden',
  },
  cardSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardBody: { flex: 1 },
  cardDate: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardSubtitle: { color: '#999', fontSize: 13, marginTop: 3 },
  cardTrailing: { alignItems: 'flex-end', gap: 6 },
  durationPill: {
    backgroundColor: 'rgba(229,72,77,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.35)',
  },
  durationPillText: { color: RED, fontSize: 12, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', marginTop: 80, gap: 8 },
  empty: { textAlign: 'center', color: '#999', fontSize: 15, fontWeight: '600', marginTop: 4 },
  emptySubtitle: { textAlign: 'center', color: '#666', fontSize: 13 },
});
