import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  role: 'athlete' | 'coach' | 'admin';
}

interface AuthStore {
  user: User | null;
  role: 'athlete' | 'coach' | 'admin' | null;
  session: any | null;
  isLoading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  role: null,
  session: null,
  isLoading: false,
  initialized: false,

  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.user) {
        const role = (session.user.user_metadata?.role || 'athlete') as 'athlete' | 'coach' | 'admin';
        await AsyncStorage.setItem('supabase-session', JSON.stringify(session));
        set({
          session,
          user: { id: session.user.id, email: session.user.email!, role },
          role,
          initialized: true,
        });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const session = data.session!;
      const role = (data.user?.user_metadata?.role || 'athlete') as 'athlete' | 'coach' | 'admin';
      await AsyncStorage.setItem('supabase-session', JSON.stringify(session));
      set({
        session,
        user: { id: data.user!.id, email: data.user!.email!, role },
        role,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('supabase-session');
    set({ user: null, role: null, session: null });
  },
}));
