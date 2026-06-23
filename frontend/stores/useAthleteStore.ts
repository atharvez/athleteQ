import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from './useAuthStore';

export interface Athlete {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  sport?: string;
  height_cm?: number;
  weight_kg?: number;
  qr_token: string;
  created_at: string;
}

export interface TestResult {
  id: string;
  athlete_id: string;
  test_event_id: string;
  result_value: number;
  unit: string;
  raw_iot_payload?: any;
  recorded_at: string;
  test_events?: { name: string; test_type: string };
}

export interface HistoryGroup {
  test_type: string;
  records: TestResult[];
  personal_best: number;
  last_result?: number;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  total_tests: number;
}

interface AthleteStore {
  profile: Athlete | null;
  history: HistoryGroup[];
  isLoadingProfile: boolean;
  isLoadingHistory: boolean;
  fetchProfile: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  refreshQRToken: () => Promise<string>;
  setProfile: (p: Athlete) => void;
}

export const useAthleteStore = create<AthleteStore>((set, get) => ({
  profile: null,
  history: [],
  isLoadingProfile: false,
  isLoadingHistory: false,

  fetchProfile: async () => {
    const role = useAuthStore.getState().role;
    if (role && role !== 'athlete') {
      return;
    }
    set({ isLoadingProfile: true });
    try {
      const res = await apiClient.get('/athletes/me');
      set({ profile: res.data, isLoadingProfile: false });
    } catch (err: any) {
      set({ isLoadingProfile: false });
      // Don't throw — let the UI handle missing profile gracefully
      console.warn('fetchProfile failed:', err?.response?.status);
    }
  },

  fetchHistory: async () => {
    const profile = get().profile;
    if (!profile) return;
    set({ isLoadingHistory: true });
    try {
      const res = await apiClient.get(`/athletes/${profile.id}/history`);
      set({ history: res.data.history || [], isLoadingHistory: false });
    } catch (err) {
      set({ isLoadingHistory: false });
    }
  },

  refreshQRToken: async () => {
    const res = await apiClient.get('/athletes/me/refresh-qr');
    const newToken = res.data.qr_token;
    const profile = get().profile;
    if (profile) {
      set({ profile: { ...profile, qr_token: newToken } });
    }
    return newToken;
  },

  setProfile: (p) => set({ profile: p }),
}));
