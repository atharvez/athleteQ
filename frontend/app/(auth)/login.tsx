import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router, Link } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS, FONTS, SPACING, RADIUS } from '@/constants/design';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    try {
      await login(email.trim().toLowerCase(), password);
      // Root layout will redirect based on role
    } catch (err: any) {
      Alert.alert('Login failed', err?.message || 'Invalid credentials');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.title}>PlayerQ</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="athlete@example.com"
              placeholderTextColor={COLORS.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Register</Text>
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
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING['2xl'] },
  logoContainer: {
    width: 80, height: 80, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  logoIcon: { fontSize: 40 },
  title: {
    fontSize: FONTS.sizes['2xl'], fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text,
    textAlign: 'center', marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary },
  form: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldGroup: { gap: SPACING.xs },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.semibold, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.dark,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.sizes.base,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  eyeBtn: { padding: SPACING.sm },
  eyeIcon: { fontSize: 18 },
  demoHint: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  demoHintText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 18 },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.xs },
  registerText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  registerLink: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, fontWeight: '700' },
});
