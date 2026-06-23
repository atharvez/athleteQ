import * as Speech from 'expo-speech';

const SPEECH_OPTIONS = {
  language: 'en-US',
  pitch: 1.0,
  rate: 0.9,
};

export const announceAthlete = (name: string, testType?: string): void => {
  const firstName = name.split(' ')[0];
  const typeLabel = testType ? ` for ${testType.replace(/_/g, ' ')}` : '';
  Speech.speak(`${firstName} is ready${typeLabel}`, SPEECH_OPTIONS);
};

export const announceTestStart = (name: string): void => {
  const firstName = name.split(' ')[0];
  Speech.speak(`Starting test for ${firstName}`, { ...SPEECH_OPTIONS, rate: 0.85 });
};

export const announceResult = (name: string, result: number, unit: string): void => {
  const firstName = name.split(' ')[0];
  Speech.speak(`${firstName} completed in ${result} ${unit}`, { ...SPEECH_OPTIONS, rate: 0.85 });
};

export const announcePersonalBest = (name: string): void => {
  const firstName = name.split(' ')[0];
  Speech.speak(`${firstName} set a new personal best!`, { ...SPEECH_OPTIONS, pitch: 1.2, rate: 0.9 });
};

export const announceError = (reason: string): void => {
  Speech.speak(reason, { ...SPEECH_OPTIONS, rate: 0.85 });
};

export const stopSpeech = (): void => {
  Speech.stop();
};
