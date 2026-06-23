import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useEventStore } from '@/stores/useEventStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiClient } from '@/lib/apiClient';
import { COLORS, FONTS, SPACING, RADIUS, STATUS_LABELS, TEST_TYPE_LABELS } from '@/constants/design';

export default function CoachDashboard() {
  const { activeEvent, events, fetchEvents, setActiveEvent } = useEventStore();
  const { logout, user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
  };

  const handleEndActiveEvent = async () => {
    if (!activeEvent) return;
    
    const finishEvent = async () => {
      try {
        await apiClient.put(`/events/${activeEvent.id}/complete`);
        setActiveEvent(null);
        await fetchEvents();
      } catch (err: any) {
        Alert.alert('Error', err?.response?.data?.detail || 'Failed to end event');
      }
    };

    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Mark this active event as completed?')) {
        finishEvent();
      }
    } else {
      Alert.alert('End Event', 'Mark this active event as completed?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Event', style: 'destructive', onPress: finishEvent },
      ]);
    }
  };

  const activeCount = events.filter(e => e.status === 'active').length;
  const todayEvents = events.filter(e => {
    const d = new Date(e.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back 👋</Text>
          <Text style={styles.role}>{user?.role === 'admin' ? 'Admin Dashboard' : 'Coach Dashboard'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: COLORS.primary + '40' }]}>
          <Text style={[styles.statNumber, { color: COLORS.primary }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Events</Text>
        </View>
        <View style={[styles.statCard, { borderColor: COLORS.secondary + '40' }]}>
          <Text style={[styles.statNumber, { color: COLORS.secondary }]}>{todayEvents.length}</Text>
          <Text style={styles.statLabel}>Today's Events</Text>
        </View>
        <View style={[styles.statCard, { borderColor: COLORS.warning + '40' }]}>
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>{events.length}</Text>
          <Text style={styles.statLabel}>Total Events</Text>
        </View>
      </View>

      {/* Active Event Banner */}
      {activeEvent && (
        <View style={styles.activeBannerContainer}>
          <TouchableOpacity 
            style={styles.activeBannerMain} 
            onPress={() => {
              if (user?.role !== 'admin') router.replace('/(coach)/scan');
            }}
          >
            <View>
              <Text style={styles.activeBannerLabel}>🟢 ACTIVE EVENT</Text>
              <Text style={styles.activeBannerName} numberOfLines={1}>{activeEvent.name}</Text>
              <Text style={styles.activeBannerType}>{TEST_TYPE_LABELS[activeEvent.test_type] || activeEvent.test_type}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activeBannerEndBtn} onPress={handleEndActiveEvent}>
            <Text style={styles.activeBannerEndBtnText}>🛑 End</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent Events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT EVENTS</Text>
          <TouchableOpacity onPress={() => router.push('/(coach)/events')}>
            <Text style={styles.seeAll}>Manage All</Text>
          </TouchableOpacity>
        </View>
        {events.slice(0, 5).map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventRow}
            onPress={() => {
              if (user?.role === 'admin') return;
              
              if (event.status === 'active') {
                setActiveEvent(event);
                router.replace('/(coach)/scan');
              } else if (event.status === 'pending') {
                Alert.alert('Activate Event', `Would you like to activate and start "${event.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Activate', onPress: async () => {
                    try {
                      await apiClient.put(`/events/${event.id}/activate`);
                      await fetchEvents();
                      router.replace('/(coach)/scan');
                    } catch (err: any) {
                      Alert.alert('Error', err?.response?.data?.detail || 'Failed to activate');
                    }
                  }}
                ]);
              } else {
                router.replace('/(coach)/results');
              }
            }}
          >
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventType}>
                {TEST_TYPE_LABELS[event.test_type] || event.test_type}
                {user?.role === 'admin' && event.coach_name && ` • by ${event.coach_name}`}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: event.status === 'active' ? COLORS.secondary + '20' : COLORS.muted + '20' }]}>
              <Text style={[styles.statusText, { color: event.status === 'active' ? COLORS.secondary : COLORS.muted }]}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {events.length === 0 && (
          <Text style={styles.noEvents}>No events yet. Start a test above.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  content: { padding: SPACING.lg, paddingTop: 60, paddingBottom: 40, gap: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.semibold, fontWeight: '600' },
  role: { fontSize: FONTS.sizes['2xl'], fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  logoutBtn: { padding: SPACING.sm },
  logoutText: { color: COLORS.danger, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, alignItems: 'center' },
  statNumber: { fontSize: FONTS.sizes['3xl'], fontFamily: FONTS.extrabold, fontWeight: '800' },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  activeBannerContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary + '15',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.secondary + '40',
    alignItems: 'center',
    overflow: 'hidden',
  },
  activeBannerMain: {
    flex: 1,
    padding: SPACING.lg,
  },
  activeBannerLabel: { fontSize: FONTS.sizes.xs, color: COLORS.secondary, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: 1 },
  activeBannerName: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  activeBannerType: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  activeBannerEndBtn: {
    backgroundColor: COLORS.danger + '15',
    height: '100%',
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.danger + '35',
  },
  activeBannerEndBtnText: {
    color: COLORS.danger,
    fontFamily: FONTS.extrabold, fontWeight: '800',
    fontSize: FONTS.sizes.sm,
  },
  section: { gap: SPACING.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 2, fontFamily: FONTS.bold, fontWeight: '700' },
  seeAll: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, fontWeight: '600' },
  eventRow: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  eventInfo: { flex: 1 },
  eventName: { fontSize: FONTS.sizes.base, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text },
  eventType: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold, fontWeight: '700' },
  noEvents: { color: COLORS.muted, fontSize: FONTS.sizes.sm, textAlign: 'center', paddingVertical: SPACING.lg },
});
