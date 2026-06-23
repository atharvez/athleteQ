import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { apiClient } from '@/lib/apiClient';
import { COLORS, FONTS, SPACING, RADIUS, TEST_TYPE_LABELS } from '@/constants/design';
import { useAuthStore } from '@/stores/useAuthStore';

interface ConsolidatedResult {
  athlete_id: string;
  full_name: string;
  sport: string;
  tests: {
    [test_type: string]: { best: number; count: number };
  };
}

export default function ConsolidatedScreen() {
  const { user } = useAuthStore();
  const [data, setData] = useState<ConsolidatedResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConsolidated = async () => {
    try {
      const res = await apiClient.get('/athletes/consolidated');
      setData(res.data.consolidated || []);
    } catch (err) {
      console.error('Failed to fetch consolidated results:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchConsolidated();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchConsolidated();
  };

  if (user?.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Consolidated</Text>
        <Text style={styles.headerCount}>Best records by player</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.athlete_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.athleteInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.full_name || '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.sport}>{item.sport || 'Athlete'}</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              {Object.entries(item.tests).map(([testType, stats]) => (
                <View key={testType} style={styles.statBox}>
                  <Text style={styles.statLabel}>{TEST_TYPE_LABELS[testType] || testType}</Text>
                  <Text style={styles.statValue}>{stats.best.toFixed(3)}s</Text>
                  <Text style={styles.statCount}>{stats.count} attempt{stats.count !== 1 ? 's' : ''}</Text>
                </View>
              ))}
              {Object.keys(item.tests).length === 0 && (
                <Text style={styles.noTests}>No test data yet.</Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.dark },
  errorText: { color: COLORS.danger, fontSize: FONTS.sizes.base, fontFamily: FONTS.semibold },
  header: { paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  headerCount: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  listContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 80 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  athleteInfo: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '30', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.primary },
  name: { fontSize: FONTS.sizes.base, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  sport: { fontSize: FONTS.sizes.xs, color: COLORS.primary },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statBox: { backgroundColor: COLORS.dark, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, minWidth: 100, flex: 1 },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.semibold, marginBottom: 2 },
  statValue: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  statCount: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  noTests: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontStyle: 'italic' },
});
