import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useAthleteStore, HistoryGroup } from '@/stores/useAthleteStore';
import { COLORS, FONTS, SPACING, RADIUS, TEST_TYPE_LABELS } from '@/constants/design';

function TrendBadge({ trend }: { trend: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    improving: { label: '↑ Improving', color: COLORS.secondary },
    declining: { label: '↓ Declining', color: COLORS.danger },
    stable: { label: '→ Stable', color: COLORS.warning },
    insufficient_data: { label: '— N/A', color: COLORS.muted },
  };
  const { label, color } = cfg[trend] || cfg['insufficient_data'];
  return (
    <View style={[styles.trendBadge, { borderColor: color + '60', backgroundColor: color + '15' }]}>
      <Text style={[styles.trendLabel, { color }]}>{label}</Text>
    </View>
  );
}

function MiniChart({ records }: { records: any[] }) {
  const last5 = records.slice(0, 5).reverse();
  if (last5.length < 2) return null;
  const vals = last5.map(r => r.result_value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const H = 48;

  return (
    <View style={styles.miniChart}>
      {last5.map((r, i) => {
        const height = H - ((r.result_value - min) / range) * (H - 8);
        const isLast = i === last5.length - 1;
        return (
          <View key={r.id} style={styles.miniBarWrapper}>
            <View
              style={[
                styles.miniBar,
                { height, backgroundColor: isLast ? COLORS.primary : COLORS.textSecondary + '60' },
              ]}
            />
            <Text style={styles.miniBarLabel}>{r.result_value.toFixed(2)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function HistoryCard({ group }: { group: HistoryGroup }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.testType}>{TEST_TYPE_LABELS[group.test_type] || group.test_type}</Text>
          <Text style={styles.totalTests}>{group.total_tests} tests recorded</Text>
        </View>
        <TrendBadge trend={group.trend} />
      </View>

      <View style={styles.pbRow}>
        <View style={styles.pbItem}>
          <Text style={styles.pbValue}>{group.personal_best.toFixed(3)}s</Text>
          <Text style={styles.pbLabel}>Personal Best</Text>
        </View>
        {group.last_result && (
          <View style={styles.pbItem}>
            <Text style={styles.pbValue}>{group.last_result.toFixed(3)}s</Text>
            <Text style={styles.pbLabel}>Last Result</Text>
          </View>
        )}
      </View>

      <MiniChart records={group.records} />
    </View>
  );
}

export default function HistoryScreen() {
  const { history, isLoadingHistory, fetchProfile, fetchHistory, profile } = useAthleteStore();

  useEffect(() => {
    const load = async () => {
      if (!profile) await fetchProfile();
      await fetchHistory();
    };
    load();
  }, []);

  if (isLoadingHistory) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Test History</Text>
        <TouchableOpacity onPress={fetchHistory} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏃</Text>
          <Text style={styles.emptyTitle}>No Results Yet</Text>
          <Text style={styles.emptyText}>
            Attend a testing event and scan your QR code to get your performance results tracked here.
          </Text>
        </View>
      ) : (
        history.map((group) => (
          <HistoryCard key={group.test_type} group={group} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  content: { padding: SPACING.lg, paddingTop: 60, paddingBottom: 40, gap: SPACING.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.dark, gap: SPACING.md },
  loadingText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  refreshBtn: { padding: SPACING.sm },
  refreshText: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700' },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  testType: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  totalTests: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  trendBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  trendLabel: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold, fontWeight: '700' },
  pbRow: { flexDirection: 'row', gap: SPACING.xl },
  pbItem: {},
  pbValue: { fontSize: FONTS.sizes['2xl'], fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  pbLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70, paddingTop: SPACING.xs },
  miniBarWrapper: { flex: 1, alignItems: 'center', gap: 4 },
  miniBar: { width: '100%', borderRadius: 3, minHeight: 8 },
  miniBarLabel: { fontSize: 9, color: COLORS.muted },
  emptyState: { alignItems: 'center', paddingVertical: SPACING['2xl'], gap: SPACING.md },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
