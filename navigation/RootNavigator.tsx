import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import ProgressScreen from '../screens/ProgressScreen';

export type RootStackParamList = {
  Tabs: undefined;
  ActiveWorkout: { sessionId: number; routineId?: number };
  SessionDetail: { sessionId: number };
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Progress: undefined;
  Library: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Library" component={ExerciseLibraryScreen} options={{ title: 'Exercises' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ title: 'Workout' }} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'Session' }} />
    </Stack.Navigator>
  );
}
