import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Animated,
  Modal, ActivityIndicator, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useEventStore } from '@/stores/useEventStore';
import { apiClient } from '@/lib/apiClient';
import { announceAthlete, announceError, announceResult } from '@/utils/voiceAnnouncer';
import { COLORS, FONTS, SPACING, RADIUS } from '@/constants/design';
import { router, useFocusEffect } from 'expo-router';

interface ScanResult {
  athlete_id: string;
  full_name: string;
  sport?: string;
  session_id: string;
  status: string;
  already_enrolled: boolean;
  result_value?: number;
  speed_kmh?: number;
}

const BARCODE_SETTINGS = { barcodeTypes: ['qr' as const] };

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>(Platform.OS === 'web' ? 'front' : 'back');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // UI only
  const { activeEvent, fetchEvents } = useEventStore();

  // Use refs for guard flags to avoid stale closures in the scan callback
  const scanningRef = useRef(true);
  const isProcessingRef = useRef(false);
  const lastScannedRef = useRef('');
  const activeEventRef = useRef(activeEvent);
  // Keep refs in sync with latest values
  useEffect(() => { activeEventRef.current = activeEvent; }, [activeEvent]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      // Reset scan state when screen gains focus
      scanningRef.current = true;
      isProcessingRef.current = false;
      lastScannedRef.current = '';
      setIsProcessing(false);
      setScanResult(null);
    }, [])
  );

  const successAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const showSuccess = () => {
    Animated.parallel([
      Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, tension: 100 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const hideSuccess = useCallback(() => {
    Animated.parallel([
      Animated.timing(successAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setScanResult(null);
      setIsProcessing(false);
      lastScannedRef.current = '';
      scanningRef.current = true;
      isProcessingRef.current = false;
    });
  }, []);

  const handleBarcodeScanned = useCallback(async (event: any) => {
    const type = event?.type ?? event?.nativeEvent?.type;
    const data = event?.data ?? event?.nativeEvent?.data;
    if (!type || !data) return;

    // Read from refs — always current, never stale
    if (!scanningRef.current || isProcessingRef.current) return;
    if (data === lastScannedRef.current) return;

    const currentEvent = activeEventRef.current;
    if (!currentEvent) {
      if (Platform.OS === 'web') {
        window.alert('Please create and activate a test event from the Dashboard first.');
      } else {
        Alert.alert('No Active Event', 'Please create and activate a test event from the Dashboard first.');
      }
      return;
    }

    // Lock immediately via refs — no waiting for re-render
    scanningRef.current = false;
    isProcessingRef.current = true;
    lastScannedRef.current = data;
    setIsProcessing(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/qr/validate', {
        qr_token: data,
        test_event_id: currentEvent.id,
      });

      const result: ScanResult = res.data;
      isProcessingRef.current = false;
      setIsProcessing(false);
      setScanResult(result);
      showSuccess();

      if (result.result_value) {
        announceResult(result.full_name, result.result_value, 'seconds');
      } else if (result.already_enrolled) {
        announceError(`${result.full_name.split(' ')[0]} is already enrolled`);
      } else {
        announceAthlete(result.full_name, currentEvent.test_type);
      }

      setTimeout(hideSuccess, 2500);
    } catch (err: any) {
      isProcessingRef.current = false;
      setIsProcessing(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const detail = err?.response?.data?.detail || 'QR token not recognized';
      announceError('Scan failed. ' + detail);

      if (Platform.OS === 'web') {
        window.alert(`Scan Failed: ${detail}`);
        scanningRef.current = true;
        lastScannedRef.current = '';
      } else {
        Alert.alert('Scan Failed', detail, [
          { text: 'OK', onPress: () => {
            scanningRef.current = true;
            lastScannedRef.current = '';
          }},
        ]);
      }
    }
  }, [hideSuccess]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>Camera Permission Required</Text>
        <Text style={styles.permText}>We need camera access to scan athlete QR codes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.manualBtn} onPress={() => router.push('/(coach)')}>
          <Text style={styles.manualBtnText}>← Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = scanResult ? scanResult.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facing}
        barcodeScannerSettings={BARCODE_SETTINGS}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Overlay UI */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.scanTitle}>Scan Athlete QR</Text>
            <TouchableOpacity
              style={styles.flipBtn}
              onPress={() => setFacing(current => current === 'back' ? 'front' : 'back')}
            >
              <Text style={styles.flipBtnText}>🔄 Flip Camera</Text>
            </TouchableOpacity>
          </View>
          {activeEvent ? (
            <View style={styles.eventPill}>
              <View style={styles.activeIndicator} />
              <Text style={styles.eventPillText}>{activeEvent.name}</Text>
            </View>
          ) : (
            <View style={[styles.eventPill, { borderColor: COLORS.danger + '40' }]}>
              <Text style={[styles.eventPillText, { color: COLORS.danger }]}>No Active Event</Text>
            </View>
          )}
        </View>

        {/* Reticle */}
        <View style={styles.reticleArea}>
          <View style={styles.reticle}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.processingText}>Verifying...</Text>
              </View>
            )}
          </View>
          <Text style={styles.reticleHint}>
            {isProcessing ? 'Processing...' : 'Align QR code within the frame'}
          </Text>
        </View>

        {/* Bottom hint */}
        <View style={styles.bottomBar}>
          {!activeEvent && (
            <TouchableOpacity style={styles.goToDashboard} onPress={() => router.push('/(coach)')}>
              <Text style={styles.goToDashboardText}>Create Event on Dashboard →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Success overlay */}
      {scanResult && (
        <Animated.View style={[styles.successOverlay, { opacity: overlayAnim }]}>
          <Animated.View style={[styles.successCard, {
            transform: [{ scale: successAnim }],
            borderColor: scanResult.already_enrolled ? COLORS.primary : COLORS.secondary,
            shadowColor: scanResult.already_enrolled ? COLORS.primary : COLORS.secondary,
          }]}>
            {/* Header Block */}
            <View style={[styles.cardHeader, { backgroundColor: scanResult.already_enrolled ? COLORS.primary : COLORS.secondary }]}>
              <Text style={styles.cardHeaderTitle}>
                {scanResult.result_value != null ? 'RESULT RECORDED' :
                  scanResult.already_enrolled ? 'ALREADY ENROLLED' : 'ATHLETE CHECKED IN'}
              </Text>
            </View>

            {/* Avatar & Info */}
            <View style={styles.cardBody}>
              <View style={[styles.cardAvatar, { backgroundColor: scanResult.already_enrolled ? COLORS.primary : COLORS.secondary }]}>
                <Text style={styles.cardAvatarText}>{initials}</Text>
              </View>
              <Text style={styles.cardNameText}>{scanResult.full_name}</Text>
              <Text style={styles.cardSportText}>{scanResult.sport || 'General Athlete'}</Text>
            </View>

            {/* Performance Stats */}
            <View style={styles.cardStatsGrid}>
              {scanResult.result_value != null ? (
                <>
                  <View style={styles.cardStatBox}>
                    <Text style={styles.cardStatValBig}>{scanResult.result_value.toFixed(3)}s</Text>
                    <Text style={styles.cardStatLblBig}>TIME TAKEN</Text>
                  </View>
                  <View style={styles.cardDividerVertical} />
                  {scanResult.speed_kmh != null ? (
                    <View style={styles.cardStatBox}>
                      <Text style={styles.cardStatValBig}>{scanResult.speed_kmh.toFixed(1)} km/h</Text>
                      <Text style={styles.cardStatLblBig}>AVG SPEED</Text>
                    </View>
                  ) : (
                    <View style={styles.cardStatBox}>
                      <Text style={styles.cardStatValBig}>--</Text>
                      <Text style={styles.cardStatLblBig}>AVG SPEED</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.cardStatBox}>
                  <Text style={[styles.cardStatValBig, { color: scanResult.already_enrolled ? COLORS.primary : COLORS.secondary }]}>
                    {scanResult.already_enrolled ? 'READY FOR NEXT TEST' : 'READY TO START'}
                  </Text>
                  <Text style={styles.cardStatLblBig}>{activeEvent?.test_type.replace('_', ' ').toUpperCase()}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  permTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  permText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
  permBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  permBtnText: { color: '#fff', fontFamily: FONTS.bold, fontWeight: '700' },
  manualBtn: { padding: SPACING.md },
  manualBtnText: { color: COLORS.primary, fontFamily: FONTS.semibold, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  topBar: { paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, backgroundColor: 'rgba(0,0,0,0.6)', gap: SPACING.sm },
  scanTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: '#fff' },
  eventPill: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.secondary + '60', backgroundColor: COLORS.secondary + '20', paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  activeIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },
  eventPillText: { fontSize: FONTS.sizes.sm, color: COLORS.secondary, fontFamily: FONTS.semibold, fontWeight: '600' },
  reticleArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xl },
  reticle: { width: 260, height: 260, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: COLORS.primary, borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  processingOverlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(14,165,233,0.1)', alignItems: 'center', justifyContent: 'center', borderRadius: 4, gap: SPACING.sm },
  processingText: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700', fontSize: FONTS.sizes.sm },
  reticleHint: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm, textAlign: 'center' },
  bottomBar: { backgroundColor: 'rgba(0,0,0,0.6)', padding: SPACING.xl, paddingBottom: 80, alignItems: 'center' },
  goToDashboard: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.full },
  goToDashboardText: { color: '#fff', fontFamily: FONTS.bold, fontWeight: '700' },

  // Strava-like Success Overlay
  successOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  successCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    width: '85%',
    maxWidth: 340,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    color: '#fff',
    fontFamily: FONTS.extrabold,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  cardBody: {
    alignItems: 'center',
    padding: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  cardAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  cardAvatarText: {
    fontSize: 28,
    fontFamily: FONTS.extrabold,
    fontWeight: '900',
    color: '#fff',
  },
  cardNameText: {
    fontSize: 22,
    fontFamily: FONTS.extrabold,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  cardSportText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    fontWeight: '500',
    marginTop: 4,
  },
  cardStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.lg,
  },
  cardStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  cardDividerVertical: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  cardStatValBig: {
    fontSize: 24,
    fontFamily: FONTS.extrabold,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  cardStatLblBig: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  flipBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  flipBtnText: {
    color: '#fff',
    fontFamily: FONTS.semibold,
    fontWeight: '600',
    fontSize: 12,
  },
});
