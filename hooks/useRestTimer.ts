import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

export function useRestTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationIdRef = useRef<string | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancelNotification = useCallback(async () => {
    if (notificationIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
      notificationIdRef.current = null;
    }
  }, []);

  const start = useCallback(
    async (seconds: number) => {
      await cancelNotification();
      setSecondsLeft(seconds);
      setRunning(true);

      notificationIdRef.current = await Notifications.scheduleNotificationAsync({
        content: { title: 'Rest over', body: 'Time for your next set.', sound: true },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
      });
    },
    [cancelNotification]
  );

  const stop = useCallback(async () => {
    clearTick();
    setRunning(false);
    setSecondsLeft(0);
    await cancelNotification();
  }, [clearTick, cancelNotification]);

  useEffect(() => {
    if (!running) return;
    clearTick();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearTick();
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return clearTick;
  }, [running, clearTick]);

  useEffect(() => {
    return () => {
      clearTick();
      cancelNotification();
    };
  }, [clearTick, cancelNotification]);

  return { secondsLeft, running, start, stop };
}
