import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEventStore } from '@/stores/useEventStore';
import { COLORS, FONTS, SPACING, RADIUS, TEST_TYPE_LABELS } from '@/constants/design';

interface ResultWithAthlete {
  id: string;
  athlete_id: string;
  test_event_id: string;
  result_value: number;
  unit: string;
  recorded_at: string;
  athletes?: { full_name: string; sport: string };
  test_events?: { name: string; test_type: string };
  coach_name?: string;
}

export default function ResultsScreen() {
  const [results, setResults] = useState<ResultWithAthlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchResults = async () => {
    try {
      // Fetch directly from Supabase via backend
      const res = await apiClient.get('/events');
      const events = res.data.events || [];
      const allResults: ResultWithAthlete[] = [];

      // Fetch results for each event (limited to recent 3 for perf)
      for (const event of events.slice(0, 10)) {
        try {
          const q = await apiClient.get(`/events/${event.id}/queue`);
          const sessions = q.data.sessions || [];
          for (const session of sessions) {
            if (session.status === 'completed') {
              // Approximate result from session
            }
          }
        } catch {}
      }

      // Better: use athlete history endpoint if we had all athlete IDs
      // For now show from supabase directly
      setResults(allResults);
    } catch {}
    setIsLoading(false);
  };

  const fetchFromSupabase = async () => {
    // This fetches all results using service-level supabase
    try {
      const { supabase } = await import('@/lib/supabase');
      const { user } = useAuthStore.getState();
      const { events } = useEventStore.getState();

      let query = supabase
        .from('test_results')
        .select('*, athletes(full_name, sport), test_events(name, test_type)');

      if (user?.role !== 'admin') {
        const eventIds = events.map(e => e.id);
        if (eventIds.length === 0) {
          setResults([]);
          setIsLoading(false);
          return;
        }
        query = query.in('test_event_id', eventIds);
      }

      const { data } = await query
        .order('recorded_at', { ascending: false })
        .limit(100);

      const mappedData = (data || []).map(r => {
        const ev = events.find(e => e.id === r.test_event_id);
        return {
          ...r,
          coach_name: ev?.coach_name || 'Unknown Coach'
        };
      });
      setResults(mappedData);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFromSupabase();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchFromSupabase();
    setIsRefreshing(false);
  };

  const testTypes = ['all', '20m_sprint', '30m_sprint', 'agility'];
  const filtered = filter === 'all' ? results : results.filter(r => r.test_events?.test_type === filter);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Results</Text>
        <Text style={styles.headerCount}>{filtered.length} records</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {testTypes.map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, filter === type && styles.chipActive]}
            onPress={() => setFilter(type)}
          >
            <Text style={[styles.chipText, filter === type && styles.chipTextActive]}>
              {type === 'all' ? 'All' : TEST_TYPE_LABELS[type] || type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <View style={styles.resultCard}>
            <View style={styles.resultLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.athletes?.full_name || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.resultName}>{item.athletes?.full_name || 'Unknown'}</Text>
                <Text style={styles.resultSport}>{item.athletes?.sport || ''}</Text>
                <Text style={styles.resultEvent}>
                  {item.test_events?.name || ''}
                  {useAuthStore.getState().user?.role === 'admin' && ` • by ${item.coach_name}`}
                </Text>
                <Text style={styles.resultDate}>{new Date(item.recorded_at).toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.resultRight}>
              <Text style={styles.resultValue}>{item.result_value.toFixed(3)}</Text>
              <Text style={styles.resultUnit}>{item.unit}</Text>
              <View style={styles.testTypePill}>
                <Text style={styles.testTypePillText}>
                  {TEST_TYPE_LABELS[item.test_events?.test_type || ''] || item.test_events?.test_type || ''}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Results Yet</Text>
            <Text style={styles.emptyText}>Results will appear here after athletes complete tests.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.dark },
  header: { paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  headerCount: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  filterRow: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  chipText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.semibold, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary },
  listContent: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 80 },
  resultCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  resultLeft: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '30', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.primary },
  resultName: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  resultSport: { fontSize: FONTS.sizes.xs, color: COLORS.primary },
  resultEvent: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  resultDate: { fontSize: FONTS.sizes.xs, color: COLORS.muted },
  resultRight: { alignItems: 'flex-end', gap: 2 },
  resultValue: { fontSize: FONTS.sizes['2xl'], fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  resultUnit: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  testTypePill: { backgroundColor: COLORS.primary + '20', paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: RADIUS.full },
  testTypePillText: { fontSize: 10, color: COLORS.primary, fontFamily: FONTS.semibold, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: SPACING['2xl'], gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
});
