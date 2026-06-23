import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Animated, Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAthleteStore } from '@/stores/useAthleteStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS, FONTS, SPACING, RADIUS } from '@/constants/design';

export default function AthleteQRScreen() {
  const { profile, isLoadingProfile, fetchProfile, refreshQRToken, history, fetchHistory } = useAthleteStore();
  const { logout } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchHistory();
    }
  }, [profile?.id]);

  useEffect(() => {
    // Pulse animation on QR
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleRefreshToken = async () => {
    Alert.alert(
      'Refresh QR Token',
      'This will invalidate your current QR code. Print a new one after refreshing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh', style: 'destructive', onPress: async () => {
            setIsRefreshing(true);
            try {
              await refreshQRToken();
              Alert.alert('✅ Done', 'Your QR token has been refreshed. Please print a new QR code.');
            } catch {
              Alert.alert('Error', 'Failed to refresh QR token.');
            }
            setIsRefreshing(false);
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      await Share.share({ message: `Athlete QR Token: ${profile.qr_token}\nName: ${profile.full_name}` });
    } catch {}
  };

  const getPB = (testType: string) => {
    const group = history.find(g => g.test_type === testType);
    return group && group.personal_best ? `${group.personal_best.toFixed(2)}s` : '--';
  };

  if (isLoadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Athlete Profile</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Strava-like Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{profile.full_name}</Text>
        <Text style={styles.profileSport}>{profile.sport || 'General Athlete'}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.height_cm ? `${profile.height_cm}cm` : '--'}</Text>
            <Text style={styles.statLabel}>Height</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.weight_kg ? `${profile.weight_kg}kg` : '--'}</Text>
            <Text style={styles.statLabel}>Weight</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : 'Other'}
            </Text>
            <Text style={styles.statLabel}>Gender</Text>
          </View>
        </View>
      </View>

      {/* PBs Section like Strava Activities summary */}
      <Text style={styles.sectionTitle}>Personal Bests</Text>
      <View style={styles.pbsContainer}>
        <View style={styles.pbCard}>
          <Text style={styles.pbLabel}>20m Sprint</Text>
          <Text style={styles.pbValue}>{getPB('20m_sprint')}</Text>
        </View>
        <View style={styles.pbCard}>
          <Text style={styles.pbLabel}>30m Sprint</Text>
          <Text style={styles.pbValue}>{getPB('30m_sprint')}</Text>
        </View>
        <View style={styles.pbCard}>
          <Text style={styles.pbLabel}>Agility</Text>
          <Text style={styles.pbValue}>{getPB('agility')}</Text>
        </View>
      </View>

      {/* QR Code Section */}
      <View style={styles.qrSection}>
        <Animated.View style={[styles.qrContainer, { transform: [{ scale: pulseAnim }] }]}>
          <QRCode
            value={profile.qr_token}
            size={180}
            backgroundColor={COLORS.qrBackground}
            color={COLORS.qrForeground}
            quietZone={16}
          />
        </Animated.View>
        <Text style={styles.qrTokenText}>Token: {profile.qr_token.slice(0, 8)}...{profile.qr_token.slice(-4)}</Text>
        <Text style={styles.qrHint}>Present this QR at check-in.</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Text style={styles.actionBtnIcon}>📤</Text>
          <Text style={styles.actionBtnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, isRefreshing && styles.btnDisabled]}
          onPress={handleRefreshToken}
          disabled={isRefreshing}
        >
          {isRefreshing ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
            <>
              <Text style={styles.actionBtnIcon}>🔄</Text>
              <Text style={styles.actionBtnText}>Refresh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  content: { padding: SPACING.lg, paddingTop: 60, paddingBottom: 40 },
  loadingContainer: { flex: 1, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base },
  errorText: { color: COLORS.danger, fontSize: FONTS.sizes.base },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  retryBtnText: { color: '#fff', fontFamily: FONTS.bold, fontWeight: '700' },
  
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  headerTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text },
  logoutBtn: { padding: SPACING.sm },
  logoutText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, fontWeight: '600' },
  
  // Strava-like Profile
  profileHeader: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: FONTS.extrabold, fontWeight: '800',
    color: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontFamily: FONTS.extrabold, fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileSport: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium, fontWeight: '500',
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.border,
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  pbsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  pbCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  pbLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.semibold, fontWeight: '600',
    marginBottom: 4,
  },
  pbValue: {
    fontSize: 18,
    fontFamily: FONTS.extrabold, fontWeight: '800',
    color: COLORS.primary,
  },

  // QR Section
  qrSection: { alignItems: 'center', marginBottom: SPACING.xl, backgroundColor: COLORS.card, padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  qrContainer: { marginBottom: SPACING.md },
  qrTokenText: { fontSize: FONTS.sizes.xs, color: COLORS.muted, fontFamily: 'monospace', marginBottom: SPACING.xs },
  qrHint: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
  
  // Actions
  actionsRow: { flexDirection: 'row', gap: SPACING.md },
  actionBtn: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  btnDisabled: { opacity: 0.5 },
  actionBtnIcon: { fontSize: 16 },
  actionBtnText: { color: COLORS.text, fontFamily: FONTS.semibold, fontWeight: '600', fontSize: FONTS.sizes.sm },
});
