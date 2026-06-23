import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEventStore, TestEvent } from '@/stores/useEventStore';
import { apiClient } from '@/lib/apiClient';
import { COLORS, FONTS, SPACING, RADIUS, TEST_TYPE_LABELS } from '@/constants/design';

const TEST_TYPES = [
  { key: '20m_sprint', label: '20m Sprint', emoji: '⚡' },
  { key: '30m_sprint', label: '30m Sprint', emoji: '🏃' },
  { key: 'agility', label: 'Agility', emoji: '🔄' },
];

function CreateModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [testType, setTestType] = useState('20m_sprint');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setIsCreating(true);
    try {
      await apiClient.post('/events', { name: name.trim(), test_type: testType });
      setName('');
      onCreated();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to create');
    }
    setIsCreating(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New Test Event</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Event Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. U18 Sprint Trials"
              placeholderTextColor={COLORS.muted}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Test Type</Text>
            <View style={styles.typeRow}>
              {TEST_TYPES.map(({ key, label, emoji }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeBtn, testType === key && styles.typeBtnActive]}
                  onPress={() => setTestType(key)}
                >
                  <Text style={styles.typeEmoji}>{emoji}</Text>
                  <Text style={[styles.typeLabel, testType === key && styles.typeLabelActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.createBtn, isCreating && { opacity: 0.6 }]} onPress={handleCreate} disabled={isCreating}>
              {isCreating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EventCard({ event, onActivate, onComplete }: {
  event: TestEvent;
  onActivate: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const { user } = useAuthStore();
  const statusColor = { pending: COLORS.warning, active: COLORS.secondary, completed: COLORS.muted }[event.status] || COLORS.muted;
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventType}>
            {TEST_TYPE_LABELS[event.test_type] || event.test_type}
            {user?.role === 'admin' && event.coach_name && ` • by ${event.coach_name}`}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusPillText, { color: statusColor }]}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.eventDate}>{new Date(event.created_at).toLocaleString()}</Text>
      {event.status === 'pending' && (
        <TouchableOpacity style={styles.activateBtn} onPress={() => onActivate(event.id)}>
          <Text style={styles.activateBtnText}>▶ Activate</Text>
        </TouchableOpacity>
      )}
      {event.status === 'active' && (
        <TouchableOpacity style={styles.completeBtn} onPress={() => onComplete(event.id)}>
          <Text style={styles.completeBtnText}>✓ Mark Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function EventsScreen() {
  const { events, fetchEvents } = useEventStore();
  const [showCreate, setShowCreate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
  };

  const handleActivate = async (id: string) => {
    try {
      await apiClient.put(`/events/${id}/activate`);
      await fetchEvents();
      // Navigate to the scan tab
      if (useAuthStore.getState().user?.role !== 'admin') {
        router.replace('/(coach)/scan');
      }
    } catch (err: any) { Alert.alert('Error', err?.response?.data?.detail); }
  };

  const handleComplete = async (id: string) => {
    const complete = async () => {
      try {
        await apiClient.put(`/events/${id}/complete`);
        await fetchEvents();
      } catch (err: any) { Alert.alert('Error', err?.response?.data?.detail); }
    };

    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Mark this event as completed?')) complete();
    } else {
      Alert.alert('Complete Event', 'Mark this event as completed?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: complete },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Test Events</Text>
        <TouchableOpacity style={styles.createFab} onPress={() => setShowCreate(true)}>
          <Text style={styles.createFabText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={e => e.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <EventCard event={item} onActivate={handleActivate} onComplete={handleComplete} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>No Events</Text>
            <Text style={styles.emptyText}>Create your first test event with the + New button.</Text>
          </View>
        }
      />

      <CreateModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchEvents} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  createFab: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  createFabText: { color: '#fff', fontFamily: FONTS.bold, fontWeight: '700' },
  listContent: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 80 },
  eventCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  eventName: { fontSize: FONTS.sizes.base, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  eventType: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  statusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  statusPillText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold, fontWeight: '700' },
  eventDate: { fontSize: FONTS.sizes.xs, color: COLORS.muted },
  activateBtn: { backgroundColor: COLORS.secondary + '20', borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.secondary + '40' },
  activateBtnText: { color: COLORS.secondary, fontFamily: FONTS.bold, fontWeight: '700' },
  completeBtn: { backgroundColor: COLORS.muted + '20', borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.muted + '40' },
  completeBtnText: { color: COLORS.muted, fontFamily: FONTS.bold, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: SPACING['2xl'], gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.md, borderTopWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  fieldGroup: { gap: SPACING.xs },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.semibold, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.dark, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: FONTS.sizes.base },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: { flex: 1, backgroundColor: COLORS.dark, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, gap: 4 },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  typeEmoji: { fontSize: 24 },
  typeLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center', fontFamily: FONTS.semibold, fontWeight: '600' },
  typeLabelActive: { color: COLORS.primary },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: { flex: 1, backgroundColor: COLORS.cardHover, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  cancelBtnText: { color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700' },
  createBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  createBtnText: { color: '#fff', fontFamily: FONTS.extrabold, fontWeight: '800', fontSize: FONTS.sizes.lg },
});
