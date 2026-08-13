# Running BAKAL with Expo Go

Commands to launch the app and open it in Expo Go, run from the project root (`/Users/fdchadrian-nc-web/Documents/BAKAL`).

## Install dependencies (first time / after pulling changes)

```bash
npm install
```

## Start the dev server

```bash
npm start
```

This runs `expo start` and shows a QR code in the terminal.

- **Physical device**: open the **Expo Go** app and scan the QR code (iOS: use the Camera app; Android: use the scanner inside Expo Go).
- **iOS Simulator**: press `i` in the terminal, or run:
  ```bash
  npm run ios
  ```
- **Android Emulator**: press `a` in the terminal, or run:
  ```bash
  npm run android
  ```
- **Web browser**: press `w` in the terminal, or run:
  ```bash
  npm run web
  ```

## Other useful keys while `expo start` is running

- `r` — reload the app
- `m` — toggle the dev menu
- `c` — clear terminal / show connection info again
- `j` — open debugger

## If the dev server won't connect (cache/network issues)

```bash
npx expo start -c
```

The `-c` flag clears the Metro bundler cache.

## If your device and computer aren't on the same network

```bash
npx expo start --tunnel
```
