import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router, Link } from 'expo-router';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS, FONTS, SPACING, RADIUS } from '@/constants/design';

const SPORTS = ['Football', 'Basketball', 'Athletics', 'Swimming', 'Rugby', 'Cricket', 'Tennis', 'Cycling', 'Other'];
const GENDERS = ['male', 'female', 'other'];

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'athlete' | 'coach'>('athlete');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [sport, setSport] = useState('Athletics');
  const [gender, setGender] = useState('male');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        role,
        sport: role === 'athlete' ? sport : undefined,
        gender: role === 'athlete' ? gender : undefined,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
      });
      // Auto-login after register
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Registration failed', err?.response?.data?.detail || err?.message || 'Something went wrong');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Sports Performance OS</Text>
        </View>

        <View style={styles.form}>
          {/* Role selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>I am a</Text>
            <View style={styles.roleRow}>
              {(['athlete', 'coach'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={styles.roleIcon}>{r === 'athlete' ? '🏃' : '🎯'}</Text>
                  <Text style={[styles.roleLabel, role === r && styles.roleLabelActive]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
              placeholder="John Smith" placeholderTextColor={COLORS.muted} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="you@example.com" placeholderTextColor={COLORS.muted}
              keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword}
              placeholder="min 6 characters" placeholderTextColor={COLORS.muted}
              secureTextEntry />
          </View>

          {role === 'athlete' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Sport</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {SPORTS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.chip, sport === s && styles.chipActive]}
                        onPress={() => setSport(s)}
                      >
                        <Text style={[styles.chipText, sport === s && styles.chipTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.chipRow}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.chip, gender === g && styles.chipActive]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput style={styles.input} value={heightCm} onChangeText={setHeightCm}
                    placeholder="175" placeholderTextColor={COLORS.muted} keyboardType="numeric" />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput style={styles.input} value={weightKg} onChangeText={setWeightKg}
                    placeholder="70" placeholderTextColor={COLORS.muted} keyboardType="numeric" />
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.registerBtn, isLoading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  scroll: { flexGrow: 1, padding: SPACING.lg, paddingTop: SPACING['2xl'] },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  title: { fontSize: FONTS.sizes['2xl'], fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary },
  form: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  fieldGroup: { gap: SPACING.xs },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.semibold, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.dark, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: FONTS.sizes.base },
  roleRow: { flexDirection: 'row', gap: SPACING.sm },
  roleBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', gap: SPACING.xs },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  roleIcon: { fontSize: 24 },
  roleLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.semibold, fontWeight: '600' },
  roleLabelActive: { color: COLORS.primary },
  row: { flexDirection: 'row', gap: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  chipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700' },
  registerBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnDisabled: { opacity: 0.6 },
  registerBtnText: { color: '#fff', fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  loginLink: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, fontWeight: '700' },
});
