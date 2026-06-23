import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { apiClient } from '@/lib/apiClient';
import { COLORS, FONTS, SPACING, RADIUS } from '@/constants/design';
import { useAuthStore } from '@/stores/useAuthStore';

interface UserItem {
  id: string;
  email?: string;
  full_name: string;
  role: string;
  sport?: string;
}

export default function UsersScreen() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'coach' | 'athlete'>('all');

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/athletes');
      const { athletes, coaches } = res.data;
      
      const allUsers: UserItem[] = [
        ...coaches.map((c: any) => ({ ...c, role: 'coach' })),
        ...athletes.map((a: any) => ({ ...a, role: 'athlete', email: 'Athlete Account' }))
      ];
      
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
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

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.role === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Users</Text>
        <Text style={styles.headerCount}>{filteredUsers.length} total</Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'coach', 'athlete'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, filter === type && styles.chipActive]}
            onPress={() => setFilter(type)}
          >
            <Text style={[styles.chipText, filter === type && styles.chipTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={styles.userLeft}>
              <View style={[styles.avatar, item.role === 'coach' ? styles.avatarCoach : undefined]}>
                <Text style={[styles.avatarText, item.role === 'coach' ? styles.avatarTextCoach : undefined]}>
                  {(item.full_name || '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{item.full_name}</Text>
                {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
                {item.sport && <Text style={styles.userSport}>{item.sport}</Text>}
              </View>
            </View>
            <View style={styles.userRight}>
              <View style={[styles.rolePill, item.role === 'coach' ? styles.rolePillCoach : undefined]}>
                <Text style={[styles.roleText, item.role === 'coach' ? styles.roleTextCoach : undefined]}>
                  {item.role.toUpperCase()}
                </Text>
              </View>
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
  filterRow: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  chipText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.semibold, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary },
  listContent: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 80 },
  userCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  userLeft: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '30', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.primary },
  avatarCoach: { backgroundColor: COLORS.statusReady + '30' },
  avatarTextCoach: { color: COLORS.statusReady },
  userName: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  userEmail: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  userSport: { fontSize: FONTS.sizes.xs, color: COLORS.primary, marginTop: 2 },
  userRight: { alignItems: 'flex-end', gap: 2 },
  rolePill: { backgroundColor: COLORS.primary + '20', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  roleText: { fontSize: 10, color: COLORS.primary, fontFamily: FONTS.extrabold, fontWeight: '800' },
  rolePillCoach: { backgroundColor: COLORS.statusReady + '20' },
  roleTextCoach: { color: COLORS.statusReady },
});
