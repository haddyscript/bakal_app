<div align="center">

# 🏋️ BAKAL

**A private, offline-first strength training companion — built solo, for one lifter, with zero compromises.**

*No accounts. No cloud. No ads. No subscription. Just you, your lifts, and your data — on your phone, forever.*

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/Storage-SQLite%20(on--device)-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-8A2BE2)](#)

</div>

---

## Why BAKAL exists

Every mainstream fitness app wants your email, your subscription, and your data on their servers. BAKAL wants none of that. It's a from-scratch iOS/Android app, designed and built end-to-end by one person, that treats your training log the way it should be treated: as *yours* — stored locally, protected by Face ID, and never sent anywhere.

What started as a simple "log a set, see a chart" MVP grew into a full training companion with progress photography, PR detection, BMI tracking, and a real contribution-graph-style streak view — all wrapped in a hand-tuned dark glassmorphism UI that doesn't look like a weekend project.

## ✨ Features

### Train
- **Live workout logging** — build a session on the fly or launch a saved routine, log weight × reps per set with a single tap
- **Rest timer** built in — auto-starts after every logged set, fully redesigned to match the app's glass aesthetic
- **Automatic PR detection** — beat your all-time best on a lift mid-workout and a trophy banner celebrates it in real time, with a permanent 🏆 marker on the set that earned it
- **One-tap "Repeat this workout"** — relaunch any past session pre-filled with the same exercises and your last-used weights, ready to progress from

### Track
- **Full session history** with swipe-to-delete and per-workout notes
- **Weight *and* volume progress charts**, per exercise, with current / best / change stat cards
- **Body weight log** with its own trend line and starting → current → change summary
- **BMI calculator** that auto-computes from your logged height and latest body weight, complete with color-coded category
- **Workout streak tracker** — a real GitHub-style contribution heatmap built from your actual training history, plus a live streak counter, replacing what used to be static, fake placeholder data
- **Progress photo timeline** — capture or import photos straight from the app, automatically organized into month-by-month sections, with a full-screen swipeable viewer for side-by-side visual progress

### Organize
- **Exercise library** grouped by muscle category, seeded with a curated default set, fully editable
- **Custom routines** — build once, start instantly from Home
- **Fast, searchable pickers** everywhere you need to find an exercise — no endless swiping

### Protect
- **Face ID / passcode lock** on app open — device-level auth, no accounts, no passwords to remember
- **100% on-device storage** via SQLite — nothing ever leaves the phone

## 🎨 Design

BAKAL runs a custom dark glassmorphism theme end to end: layered blur cards, soft sheens, subtle depth shadows, and the Fredoka display font for a look that's distinctly its own rather than "default React Native." Every screen — Home, Active Workout, History, Progress, Exercise Library — was individually redesigned and polished, not just scaffolded.

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | [Expo](https://expo.dev) (React Native + TypeScript) |
| Storage | `expo-sqlite` — local, on-device, zero backend |
| Navigation | React Navigation (bottom tabs + native stack) |
| Charts | `react-native-gifted-charts` |
| Media | `expo-image-picker` + the new `expo-file-system` File/Directory API |
| Auth | `expo-local-authentication` (Face ID / passcode) |
| Notifications | `expo-notifications` (rest timer alerts) |
| Fonts | `@expo-google-fonts/fredoka` |

## 🗄 Data Model

Everything lives in a single versioned, migration-driven SQLite database — no server, no sync conflicts, no downtime:

```
exercises          — the movement library, grouped by muscle group
sessions           — one row per workout (date, name, notes, duration)
sets               — weight × reps logged against a session + exercise
routines           — saved templates for one-tap workout starts
routine_exercises  — exercises attached to a routine, ordered
body_weight        — body weight entries over time
profile            — height, used for BMI
progress_photos    — timestamped photo references for the progress timeline
```

Every schema change ships as an incremental, backward-compatible migration — the app has evolved through 14 schema versions without ever losing a single logged set.

## 🚀 Getting Started

No Xcode. No Android Studio. Just a phone and a terminal.

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS or Android) and you're training. See [`EXPO_COMMANDS.md`](./EXPO_COMMANDS.md) for the full command reference, including simulator/emulator and tunnel options.

## 📁 Project Structure

```
screens/       Home, Active Workout, History, Progress, Exercise Library, Session Detail
components/    Shared UI primitives (Text, TextInput, RestTimer)
db/            SQLite schema + versioned migrations
navigation/    Tab + stack navigation config
types/         Shared TypeScript models
utils/         Date parsing and other small helpers
theme/         Typography and design tokens
```

## 🧭 What's next

BAKAL is under active, iterative development — every feature above was designed, built, and refined through real usage, not a spec written up front. Ideas on deck: superset support, per-exercise 1RM estimates, workout templates saved straight from history, and rest-day recommendations based on training frequency.

---

<div align="center">

**Built by one person, for one lifter — no investors, no roadmap meetings, no compromises.**

</div>
