import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export function useAppLock() {
  const [unlocked, setUnlocked] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);
  const authenticatingRef = useRef(false);

  const authenticate = useCallback(async () => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setAuthenticating(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        // No Face ID / passcode set up on this device — don't block a personal app on it.
        setAvailable(false);
        setUnlocked(true);
        return;
      }
      setAvailable(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock BAKAL',
        disableDeviceFallback: false,
      });
      setUnlocked(result.success);
    } finally {
      authenticatingRef.current = false;
      setAuthenticating(false);
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prevState = appState.current;

      // 'inactive' is a brief transitional state also triggered by the Face ID /
      // passcode system sheet itself — only a full 'background' means the user
      // actually left the app, so only react to that (not 'inactive').
      if (prevState === 'active' && nextState === 'background') {
        setUnlocked(false);
      }
      if (prevState === 'background' && nextState === 'active' && available !== false) {
        authenticate();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [authenticate, available]);

  return { unlocked, authenticating, retry: authenticate };
}
