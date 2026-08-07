import type { DoseOccurrence } from '../types';

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
};

const playTone = (context: AudioContext, start: number, frequency: number): void => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.3);
};

export const playAlarmSound = async (): Promise<boolean> => {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === 'suspended') await context.resume();
    const start = context.currentTime + 0.03;
    playTone(context, start, 740);
    playTone(context, start + 0.36, 880);
    playTone(context, start + 0.72, 740);
    return true;
  } catch {
    return false;
  }
};

export const notificationsSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export const getNotificationPermission = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported';

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
};

export const showSystemNotification = async (occurrence: DoseOccurrence): Promise<boolean> => {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;

  const baseUrl = import.meta.env.BASE_URL;
  const title = occurrence.snoozed ? 'Lembrete adiado' : 'Hora do remédio';
  const body = `${occurrence.medicationName}${occurrence.dosage ? ` — ${occurrence.dosage}` : ''}`;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration(baseUrl);
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: `${baseUrl}icons/icon-192.png`,
          badge: `${baseUrl}icons/favicon-32.png`,
          tag: occurrence.alertKey,
          data: { url: baseUrl, doseKey: occurrence.key },
        });
        return true;
      }
    }

    new Notification(title, { body, icon: `${baseUrl}icons/icon-192.png`, tag: occurrence.alertKey });
    return true;
  } catch {
    return false;
  }
};
