import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAthleteStore } from '@/stores/useAthleteStore';
import { apiClient } from '@/lib/apiClient';
import { COLORS, FONTS, SPACING, RADIUS } from '@/constants/design';

export default function ProfileScreen() {
  const { profile, fetchProfile } = useAthleteStore();
  const [fullName, setFullName] = useState('');
  const [sport, setSport] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setSport(profile.sport || '');
      setHeight(profile.height_cm ? profile.height_cm.toString() : '');
      setWeight(profile.weight_kg ? profile.weight_kg.toString() : '');
      setGender(profile.gender || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put('/athletes/me', {
        full_name: fullName,
        sport: sport,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        gender: gender,
      });
      await fetchProfile();
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to update profile');
    }
    setIsSaving(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit Profile</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor={COLORS.muted} />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Sport</Text>
        <TextInput style={styles.input} value={sport} onChangeText={setSport} placeholder="e.g. Football, Basketball" placeholderTextColor={COLORS.muted} />
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" placeholderTextColor={COLORS.muted} />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholderTextColor={COLORS.muted} />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {['male', 'female', 'other'].map(g => (
            <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderBtnActive]} onPress={() => setGender(g)}>
              <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  content: { padding: SPACING.lg, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.extrabold, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xl },
  formGroup: { marginBottom: SPACING.lg },
  label: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, fontWeight: '600', marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: FONTS.sizes.base },
  row: { flexDirection: 'row', gap: SPACING.md },
  genderRow: { flexDirection: 'row', gap: SPACING.sm },
  genderBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  genderBtnActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  genderText: { color: COLORS.textSecondary, fontFamily: FONTS.semibold, fontWeight: '600' },
  genderTextActive: { color: COLORS.primary },
  saveBtn: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.md },
  saveBtnText: { color: '#fff', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold, fontWeight: '700' },
});
