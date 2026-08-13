import { useCallback, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, FlatList, Modal, Alert, Image, Dimensions, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import { setStatusBarStyle } from 'expo-status-bar';
import type { Exercise, BodyWeightEntry, ProgressPhoto } from '../types';
import { parseSqliteDate } from '../utils/date';

interface ProgressPoint {
  date: string;
  max_weight: number;
  volume: number;
}

type Metric = 'weight' | 'volume';
type Selection = number | 'bodyweight' | 'photos' | null;

const PHOTOS_DIR = new Directory(Paths.document, 'progress-photos');
const GRID_GAP = 8;
const GRID_COLUMNS = 3;
const GRID_ITEM_SIZE = (Dimensions.get('window').width - 40 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const RED = '#e5484d';

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<Selection>(null);
  const [points, setPoints] = useState<ProgressPoint[]>([]);
  const [metric, setMetric] = useState<Metric>('weight');
  const [bodyWeights, setBodyWeights] = useState<BodyWeightEntry[]>([]);
  const [bwInput, setBwInput] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [heightInput, setHeightInput] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const loadExercises = useCallback(async () => {
    const rows = await db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY name ASC');
    setExercises(rows);
    setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
  }, [db]);

  const loadBodyWeights = useCallback(async () => {
    const rows = await db.getAllAsync<BodyWeightEntry>('SELECT * FROM body_weight ORDER BY date ASC');
    setBodyWeights(rows);
  }, [db]);

  const loadProfile = useCallback(async () => {
    const row = await db.getFirstAsync<{ height_cm: number | null }>('SELECT height_cm FROM profile WHERE id = 1');
    setHeightCm(row?.height_cm ?? null);
    setHeightInput(row?.height_cm != null ? String(row.height_cm) : '');
  }, [db]);

  async function saveHeight() {
    const value = parseFloat(heightInput);
    if (!Number.isFinite(value) || value <= 0) return;
    await db.runAsync('INSERT OR REPLACE INTO profile (id, height_cm) VALUES (1, ?)', value);
    setHeightCm(value);
  }

  async function addBodyWeight() {
    const weight = parseFloat(bwInput);
    if (!Number.isFinite(weight)) return;
    await db.runAsync("INSERT INTO body_weight (weight, date) VALUES (?, datetime('now'))", weight);
    setBwInput('');
    loadBodyWeights();
  }

  const loadPhotos = useCallback(async () => {
    const rows = await db.getAllAsync<ProgressPhoto>('SELECT * FROM progress_photos ORDER BY date DESC');
    setPhotos(rows);
  }, [db]);

  async function savePickedPhoto(uri: string) {
    PHOTOS_DIR.create({ intermediates: true, idempotent: true });
    const destFile = new File(PHOTOS_DIR, `${Date.now()}.jpg`);
    new File(uri).copy(destFile);
    await db.runAsync("INSERT INTO progress_photos (uri, date) VALUES (?, datetime('now'))", destFile.uri);
    loadPhotos();
  }

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to take progress photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) await savePickedPhoto(result.assets[0].uri);
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Enable photo library access in Settings to add progress photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) await savePickedPhoto(result.assets[0].uri);
  }

  function addPhoto() {
    Alert.alert('Add Progress Photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Take Photo', onPress: pickFromCamera },
    ]);
  }

  function deletePhoto(photo: ProgressPhoto) {
    Alert.alert('Delete photo?', 'This photo will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const file = new File(photo.uri);
          if (file.exists) file.delete();
          await db.runAsync('DELETE FROM progress_photos WHERE id = ?', photo.id);
          setViewerIndex(null);
          loadPhotos();
        },
      },
    ]);
  }

  function deleteBodyWeight(entry: BodyWeightEntry) {
    Alert.alert('Delete entry?', `Remove the ${entry.weight}kg entry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM body_weight WHERE id = ?', entry.id);
          loadBodyWeights();
        },
      },
    ]);
  }

  const loadProgress = useCallback(
    async (exerciseId: number) => {
      const rows = await db.getAllAsync<ProgressPoint>(
        `SELECT sessions.date as date, MAX(sets.weight) as max_weight, SUM(sets.weight * sets.reps) as volume
         FROM sets
         JOIN sessions ON sessions.id = sets.session_id
         WHERE sets.exercise_id = ?
         GROUP BY sets.session_id
         ORDER BY sessions.date ASC`,
        exerciseId
      );
      setPoints(rows);
    },
    [db]
  );

  useFocusEffect(
    useCallback(() => {
      loadExercises();
      loadBodyWeights();
      loadProfile();
      loadPhotos();
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [loadExercises, loadBodyWeights, loadProfile, loadPhotos])
  );

  useFocusEffect(
    useCallback(() => {
      if (typeof selectedId === 'number') {
        loadProgress(selectedId);
      }
    }, [selectedId, loadProgress])
  );

  const bwChartData = bodyWeights.map((p) => ({
    value: p.weight,
    label: parseSqliteDate(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  const bwStats = useMemo(() => {
    if (bodyWeights.length === 0) return null;
    const current = bodyWeights[bodyWeights.length - 1].weight;
    const starting = bodyWeights[0].weight;
    return { current, starting, change: current - starting };
  }, [bodyWeights]);

  const bmi = useMemo(() => {
    const latestWeight = bodyWeights[bodyWeights.length - 1]?.weight;
    if (!heightCm || !latestWeight) return null;
    const heightM = heightCm / 100;
    const value = latestWeight / (heightM * heightM);
    return Math.round(value * 10) / 10;
  }, [heightCm, bodyWeights]);

  const bmiCategory = useMemo(() => {
    if (bmi == null) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: '#5eb1f0' };
    if (bmi < 25) return { label: 'Normal', color: '#4ade80' };
    if (bmi < 30) return { label: 'Overweight', color: '#f5b942' };
    return { label: 'Obese', color: RED };
  }, [bmi]);

  function iconFor(id: Selection): keyof typeof Ionicons.glyphMap {
    if (id === 'bodyweight') return 'scale-outline';
    if (id === 'photos') return 'images-outline';
    return 'barbell';
  }

  const selectedLabel =
    selectedId === 'bodyweight'
      ? 'Body Weight'
      : selectedId === 'photos'
        ? 'Progress Photos'
        : exercises.find((ex) => ex.id === selectedId)?.name ?? 'Select an exercise';

  const pickerOptions = useMemo(() => {
    const all = [
      { id: 'bodyweight' as const, name: 'Body Weight' },
      { id: 'photos' as const, name: 'Progress Photos' },
      ...exercises,
    ];
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return all;
    return all.filter((item) => item.name.toLowerCase().includes(query));
  }, [exercises, pickerSearch]);

  function closePicker() {
    setPickerVisible(false);
    setPickerSearch('');
  }

  const chartData = points.map((p) => ({
    value: metric === 'weight' ? p.max_weight : p.volume,
    label: parseSqliteDate(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((p) => (metric === 'weight' ? p.max_weight : p.volume));
    const current = values[values.length - 1];
    const best = Math.max(...values);
    const change = current - values[0];
    return { current, best, change };
  }, [points, metric]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.selectorWrap} onPress={() => setPickerVisible(true)}>
        <BlurView intensity={30} tint="dark" style={styles.selector}>
          <Ionicons name={iconFor(selectedId)} size={16} color="#fff" style={styles.selectorIcon} />
          <Text style={styles.selectorText}>{selectedLabel}</Text>
          <Ionicons name="chevron-down" size={18} color="#999" />
        </BlurView>
      </Pressable>

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={closePicker}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose what to view</Text>
            <Pressable onPress={closePicker} hitSlop={8}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.pickerSearchWrap}>
            <Ionicons name="search" size={16} color="#777" />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Search exercises..."
              placeholderTextColor="#666"
              value={pickerSearch}
              onChangeText={setPickerSearch}
              autoFocus
            />
            {pickerSearch.length > 0 ? (
              <Pressable onPress={() => setPickerSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#777" />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={pickerOptions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.pickerList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.id === selectedId;
              return (
                <View style={styles.pickerRowWrap}>
                  <BlurView intensity={30} tint="dark" style={[styles.pickerRow, active && styles.pickerRowActive]}>
                    <Pressable
                      style={styles.pickerRowInner}
                      onPress={() => {
                        setSelectedId(item.id);
                        closePicker();
                      }}
                    >
                      <Ionicons name={iconFor(item.id)} size={16} color="#fff" style={styles.selectorIcon} />
                      <Text style={styles.pickerRowText}>{item.name}</Text>
                      {active ? <Ionicons name="checkmark" size={18} color={RED} /> : null}
                    </Pressable>
                  </BlurView>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No matches.</Text>}
          />
        </View>
      </Modal>

      {selectedId === 'bodyweight' ? (
        <ScrollView contentContainerStyle={styles.bwScrollContent}>
          <View style={styles.chartCardWrap}>
            <BlurView intensity={40} tint="dark" style={styles.chartCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 1 }}
                style={styles.chartCardSheen}
              />

              <View style={styles.bwInputRow}>
                <TextInput
                  style={styles.bwInput}
                  placeholder="Log today's weight (kg)"
                  placeholderTextColor="#777"
                  keyboardType="decimal-pad"
                  value={bwInput}
                  onChangeText={setBwInput}
                />
                <Pressable style={styles.bwAddButton} onPress={addBodyWeight}>
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>

              {bwStats ? (
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{bwStats.current}</Text>
                    <Text style={styles.statLabel}>Current (kg)</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{bwStats.starting}</Text>
                    <Text style={styles.statLabel}>Starting (kg)</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, bwStats.change <= 0 ? styles.statPositive : styles.statNegative]}>
                      {bwStats.change >= 0 ? '+' : ''}
                      {Math.round(bwStats.change * 10) / 10}
                    </Text>
                    <Text style={styles.statLabel}>Change (kg)</Text>
                  </View>
                </View>
              ) : null}

              {bwChartData.length < 2 ? (
                <Text style={styles.emptySubtitle}>Log at least 2 entries to see a trend.</Text>
              ) : (
                <LineChart
                  data={bwChartData}
                  thickness={3}
                  color={RED}
                  dataPointsColor={RED}
                  curved
                  areaChart
                  startFillColor="rgba(229,72,77,0.25)"
                  endFillColor="rgba(229,72,77,0)"
                  startOpacity={0.5}
                  endOpacity={0}
                  noOfSections={4}
                  spacing={Math.max(40, 260 / bwChartData.length)}
                  yAxisTextStyle={{ color: '#888' }}
                  xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
                  yAxisColor="rgba(255,255,255,0.1)"
                  xAxisColor="rgba(255,255,255,0.1)"
                  hideRules
                />
              )}
            </BlurView>
          </View>

          <View style={styles.chartCardWrap}>
            <BlurView intensity={40} tint="dark" style={styles.chartCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 1 }}
                style={styles.chartCardSheen}
              />
              <Text style={styles.chartTitle}>BMI Calculator</Text>

              <View style={styles.bwInputRow}>
                <TextInput
                  style={styles.bwInput}
                  placeholder="Height (cm)"
                  placeholderTextColor="#777"
                  keyboardType="decimal-pad"
                  value={heightInput}
                  onChangeText={setHeightInput}
                  onEndEditing={saveHeight}
                />
              </View>

              {bmi != null && bmiCategory ? (
                <View style={styles.bmiResultRow}>
                  <Text style={styles.bmiValue}>{bmi}</Text>
                  <View style={[styles.bmiPill, { backgroundColor: `${bmiCategory.color}22`, borderColor: `${bmiCategory.color}55` }]}>
                    <Text style={[styles.bmiPillText, { color: bmiCategory.color }]}>{bmiCategory.label}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptySubtitle}>
                  {heightCm == null ? 'Enter your height above' : 'Log a body weight entry'} to calculate BMI.
                </Text>
              )}
            </BlurView>
          </View>

          {bodyWeights.length > 0 ? (
            <View style={styles.bwEntriesWrap}>
              <Text style={styles.bwEntriesTitle}>Recent Entries</Text>
              {bodyWeights
                .slice()
                .reverse()
                .slice(0, 8)
                .map((entry) => (
                  <View key={entry.id} style={styles.bwEntryRow}>
                    <Text style={styles.bwEntryDate}>
                      {parseSqliteDate(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text style={styles.bwEntryWeight}>{entry.weight} kg</Text>
                    <Pressable onPress={() => deleteBodyWeight(entry)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color="#888" />
                    </Pressable>
                  </View>
                ))}
            </View>
          ) : null}
        </ScrollView>
      ) : selectedId === 'photos' ? (
        <View style={styles.photosContainer}>
          <Pressable style={styles.addPhotoButton} onPress={addPhoto}>
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.addPhotoButtonText}>Add Photo</Text>
          </Pressable>

          {photos.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="images-outline" size={36} color="#444" />
              <Text style={styles.empty}>No progress photos yet</Text>
              <Text style={styles.emptySubtitle}>Add one every month or so to track changes over time.</Text>
            </View>
          ) : (
            <FlatList
              data={photos}
              keyExtractor={(item) => String(item.id)}
              numColumns={GRID_COLUMNS}
              contentContainerStyle={styles.photoGrid}
              columnWrapperStyle={styles.photoGridRow}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => setViewerIndex(index)}>
                  <Image source={{ uri: item.uri }} style={styles.photoThumb} />
                  <Text style={styles.photoThumbDate}>
                    {parseSqliteDate(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </Pressable>
              )}
            />
          )}

          <Modal visible={viewerIndex != null} animationType="fade" onRequestClose={() => setViewerIndex(null)}>
            <View style={styles.viewerContainer}>
              <View style={styles.viewerHeader}>
                <Text style={styles.viewerDate}>
                  {viewerIndex != null && photos[viewerIndex]
                    ? parseSqliteDate(photos[viewerIndex].date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : ''}
                </Text>
                <View style={styles.viewerHeaderActions}>
                  <Pressable onPress={() => viewerIndex != null && deletePhoto(photos[viewerIndex])} hitSlop={8}>
                    <Ionicons name="trash-outline" size={22} color="#e5484d" />
                  </Pressable>
                  <Pressable onPress={() => setViewerIndex(null)} hitSlop={8}>
                    <Ionicons name="close" size={26} color="#fff" />
                  </Pressable>
                </View>
              </View>

              {viewerIndex != null && photos[viewerIndex] ? (
                <Image source={{ uri: photos[viewerIndex].uri }} style={styles.viewerImage} resizeMode="contain" />
              ) : null}

              <View style={styles.viewerNav}>
                <Pressable
                  disabled={viewerIndex == null || viewerIndex >= photos.length - 1}
                  onPress={() => setViewerIndex((i) => (i != null ? i + 1 : i))}
                  style={styles.viewerNavButton}
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={viewerIndex != null && viewerIndex < photos.length - 1 ? '#fff' : '#444'}
                  />
                  <Text style={styles.viewerNavText}>Older</Text>
                </Pressable>
                <Pressable
                  disabled={viewerIndex == null || viewerIndex <= 0}
                  onPress={() => setViewerIndex((i) => (i != null ? i - 1 : i))}
                  style={styles.viewerNavButton}
                >
                  <Text style={styles.viewerNavText}>Newer</Text>
                  <Ionicons name="chevron-forward" size={22} color={viewerIndex != null && viewerIndex > 0 ? '#fff' : '#444'} />
                </Pressable>
              </View>
            </View>
          </Modal>
        </View>
      ) : exercises.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="stats-chart-outline" size={36} color="#444" />
          <Text style={styles.empty}>No exercises yet</Text>
          <Text style={styles.emptySubtitle}>Add exercises and log some sets to see progress here.</Text>
        </View>
      ) : chartData.length < 2 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="trending-up-outline" size={36} color="#444" />
          <Text style={styles.empty}>Not enough data yet</Text>
          <Text style={styles.emptySubtitle}>Log this exercise in at least 2 workouts to see a trend.</Text>
        </View>
      ) : (
        <View style={styles.chartCardWrap}>
          <BlurView intensity={40} tint="dark" style={styles.chartCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 1 }}
              style={styles.chartCardSheen}
            />

            <View style={styles.metricToggle}>
              <Pressable
                style={[styles.metricPill, metric === 'weight' && styles.metricPillActive]}
                onPress={() => setMetric('weight')}
              >
                <Text style={[styles.metricPillText, metric === 'weight' && styles.metricPillTextActive]}>
                  Weight
                </Text>
              </Pressable>
              <Pressable
                style={[styles.metricPill, metric === 'volume' && styles.metricPillActive]}
                onPress={() => setMetric('volume')}
              >
                <Text style={[styles.metricPillText, metric === 'volume' && styles.metricPillTextActive]}>
                  Volume
                </Text>
              </Pressable>
            </View>

            {stats ? (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(stats.current)}</Text>
                  <Text style={styles.statLabel}>Current (kg)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(stats.best)}</Text>
                  <Text style={styles.statLabel}>Best (kg)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, stats.change >= 0 ? styles.statPositive : styles.statNegative]}>
                    {stats.change >= 0 ? '+' : ''}
                    {Math.round(stats.change)}
                  </Text>
                  <Text style={styles.statLabel}>Change (kg)</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.chartTitle}>
              {metric === 'weight' ? 'Top set weight per workout' : 'Total volume per workout'}
            </Text>
            <LineChart
              data={chartData}
              thickness={3}
              color={RED}
              dataPointsColor={RED}
              curved
              areaChart
              startFillColor="rgba(229,72,77,0.25)"
              endFillColor="rgba(229,72,77,0)"
              startOpacity={0.5}
              endOpacity={0}
              noOfSections={4}
              spacing={Math.max(40, 260 / chartData.length)}
              yAxisTextStyle={{ color: '#888' }}
              xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
              yAxisColor="rgba(255,255,255,0.1)"
              xAxisColor="rgba(255,255,255,0.1)"
              hideRules
            />
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  bwScrollContent: { paddingBottom: 40 },
  bwInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 20 },
  bwInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bwAddButton: {
    backgroundColor: RED,
    borderRadius: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bwEntriesWrap: { marginHorizontal: 20, marginTop: 4 },
  bwEntriesTitle: { color: '#999', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  bwEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bwEntryDate: { color: '#999', fontSize: 13, flex: 1 },
  bwEntryWeight: { color: '#fff', fontSize: 13, fontWeight: '700', marginRight: 16 },

  bmiResultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  bmiValue: { color: '#fff', fontSize: 32, fontWeight: '800' },
  bmiPill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  bmiPillText: { fontSize: 13, fontWeight: '700' },

  selectorWrap: { marginHorizontal: 20, marginTop: 16, marginBottom: 4 },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  selectorIcon: { marginRight: 10 },
  selectorText: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700' },

  pickerContainer: { flex: 1, paddingTop: 60, paddingHorizontal: 16, backgroundColor: '#0d0d0d' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pickerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pickerSearchInput: { flex: 1, color: '#fff', fontSize: 15 },
  pickerList: { paddingBottom: 24 },
  pickerRowWrap: {
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  pickerRow: { backgroundColor: 'rgba(255,255,255,0.05)' },
  pickerRowActive: { backgroundColor: 'rgba(229,72,77,0.14)' },
  pickerRowInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  pickerRowText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },

  chartCardWrap: {
    margin: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  chartCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 20 },
  chartCardSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },

  metricToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metricPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18 },
  metricPillActive: { backgroundColor: RED },
  metricPillText: { color: '#999', fontSize: 12, fontWeight: '700' },
  metricPillTextActive: { color: '#fff' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statPositive: { color: '#4ade80' },
  statNegative: { color: RED },
  statLabel: { color: '#999', fontSize: 11, marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: 'rgba(255,255,255,0.14)' },

  chartTitle: { fontSize: 13, fontWeight: '600', marginBottom: 16, color: '#999' },

  emptyWrap: { alignItems: 'center', marginTop: 80, gap: 8, paddingHorizontal: 24 },
  empty: { textAlign: 'center', color: '#999', fontSize: 15, fontWeight: '600', marginTop: 4 },
  emptySubtitle: { textAlign: 'center', color: '#666', fontSize: 13 },

  photosContainer: { flex: 1 },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addPhotoButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  photoGrid: { paddingHorizontal: 20, paddingBottom: 40 },
  photoGridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  photoThumb: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  photoThumbDate: { color: '#999', fontSize: 10, marginTop: 4, textAlign: 'center' },

  viewerContainer: { flex: 1, backgroundColor: '#000', paddingTop: 60 },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  viewerDate: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  viewerHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  viewerImage: { flex: 1, width: '100%' },
  viewerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  viewerNavButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewerNavText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
