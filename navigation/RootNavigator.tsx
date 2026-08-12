import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import ProgressScreen from '../screens/ProgressScreen';

export type RootStackParamList = {
  Tabs: undefined;
  ActiveWorkout: { sessionId: number; routineId?: number; initialName?: string };
  SessionDetail: { sessionId: number };
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Progress: undefined;
  Library: undefined;
};

const RED = '#e5484d';

const TAB_ICONS: Record<keyof TabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  Progress: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Library: { active: 'barbell', inactive: 'barbell-outline' },
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: RED,
        tabBarInactiveTintColor: '#8a8a8a',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, size, focused }) => {
          const icon = TAB_ICONS[route.name as keyof TabParamList];
          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ headerStyle: styles.darkHeader, headerTintColor: '#fff', headerShadowVisible: false }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ headerStyle: styles.darkHeader, headerTintColor: '#fff', headerShadowVisible: false }} />
      <Tab.Screen
        name="Library"
        component={ExerciseLibraryScreen}
        options={{ title: 'Exercises', headerStyle: styles.darkHeader, headerTintColor: '#fff', headerShadowVisible: false }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{ title: 'Workout', headerStyle: styles.darkHeader, headerTintColor: '#fff', headerShadowVisible: false }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: 'Session', headerStyle: styles.darkHeader, headerTintColor: '#fff', headerShadowVisible: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#111214',
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBarLabel: { fontSize: 11, fontWeight: '600' },
  darkHeader: { backgroundColor: '#0d0d0d' },
});
