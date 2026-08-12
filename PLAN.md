# BAKAL — Personal Workout Tracker

Personal gym tracker app for iPhone 13, built and run entirely from VS Code (no Xcode/Android Studio GUI needed for day-to-day dev).

## Stack

- **Framework**: Expo (React Native + TypeScript)
- **Storage**: `expo-sqlite` — local-only, on-device, no backend
- **Navigation**: React Navigation (tab + stack)
- **Charts**: `react-native-gifted-charts` (or `victory-native`) for progress views
- **Rest timer**: `expo-notifications` for countdown alerts
- **Auth**: `expo-local-authentication` — Face ID / passcode gate on app open (no accounts, no backend; stays local-only)
- **Dev workflow**: `npx expo start` + Expo Go app on iPhone (scan QR code, live reload, no Xcode)

## Data Model (SQLite)

- `exercises` — id, name, muscle_group, created_at
- `sessions` — id, date, duration, notes
- `sets` — id, session_id, exercise_id, weight, reps, order, rest_seconds
- `routines` / `routine_exercises` — (later) templates for pre-built workouts

## Screens

1. **Home** — start a workout / pick a routine
2. **Active Workout** — add exercises, log sets (weight × reps), rest timer between sets
3. **History** — list of past sessions
4. **Progress** — per-exercise charts (weight/volume over time)
5. **Exercise Library** — manage the exercise list

## MVP Scope (confirmed)

- Log workouts (exercises, sets, reps, weight)
- Progress tracking & charts
- Rest timer
- App lock via Face ID / passcode (device-level auth, no accounts)

Data storage: **local only** (SQLite on-device). No cloud sync for now — simplest path for a single-user personal app; can revisit if a phone reset/upgrade risk becomes a concern.

## Build Phases

1. Scaffold Expo project, get it running on iPhone via Expo Go
2. Core logging: exercises → sets → sessions, saved to SQLite
3. History view
4. Progress charts (needs logged data first)
5. Rest timer + notifications
6. Face ID / passcode app lock
7. Templates/routines
8. *(Optional later)* EAS cloud build for a standalone home-screen install without needing Expo Go open

## Getting Started (prerequisites)

- Node.js installed
- `npx create-expo-app` run in this folder
- **Expo Go** app (free) installed on iPhone from the App Store
- Then: `npx expo start` → scan QR code from VS Code terminal

## Open Questions / Future Decisions

- Exercise list content (preset library vs. add-your-own from scratch)
- UI style preferences
- Whether to later add HealthKit integration (would require EAS build, still no local Xcode needed)
