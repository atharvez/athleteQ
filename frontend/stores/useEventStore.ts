import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';

export interface TestEvent {
  id: string;
  name: string;
  test_type: string;
  status: 'pending' | 'active' | 'completed';
  created_by?: string;
  coach_name?: string;
  created_at: string;
}

export interface AthleteSession {
  id: string;
  athlete_id: string;
  athlete_name: string;
  athlete_sport?: string;
  test_event_id: string;
  status: 'queued' | 'ready' | 'testing' | 'completed';
  scanned_at: string;
}

interface EventStore {
  activeEvent: TestEvent | null;
  events: TestEvent[];
  queue: AthleteSession[];
  queueLastUpdated: number;
  isLoadingQueue: boolean;
  isFetchingEvents: boolean;
  setActiveEvent: (event: TestEvent | null) => void;
  fetchEvents: () => Promise<void>;
  fetchQueue: (eventId: string) => Promise<void>;
  subscribeToQueue: (eventId: string) => () => void;
}

export const useEventStore = create<EventStore>((set, get) => ({
  activeEvent: null,
  events: [],
  queue: [],
  queueLastUpdated: 0,
  isLoadingQueue: false,
  isFetchingEvents: false,

  setActiveEvent: (event) => set({ activeEvent: event }),

  fetchEvents: async () => {
    set({ isFetchingEvents: true });
    try {
      const res = await apiClient.get('/events');
      const events = res.data.events || [];
      set({ events });
      const active = events.find((e: any) => e.status === 'active') || null;
      set({ activeEvent: active });
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      set({ isFetchingEvents: false });
    }
  },

  fetchQueue: async (eventId: string) => {
    set({ isLoadingQueue: true });
    try {
      const res = await apiClient.get(`/events/${eventId}/queue`);
      set({
        queue: res.data.sessions || [],
        queueLastUpdated: Date.now(),
        isLoadingQueue: false,
      });
    } catch (err) {
      console.error('Failed to fetch queue:', err);
      set({ isLoadingQueue: false });
      // Keep existing queue on error (offline resilience)
    }
  },

  subscribeToQueue: (eventId: string) => {
    const channel = supabase
      .channel(`queue:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athlete_sessions',
          filter: `test_event_id=eq.${eventId}`,
        },
        async (_payload) => {
          // Refetch full queue on any change (ensures joined athlete data)
          await get().fetchQueue(eventId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
