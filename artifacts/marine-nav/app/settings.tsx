import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@/context/NavigationContext';
import { useColors } from '@/hooks/useColors';

function OptionRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.optionRow}>
      <Text style={[styles.optionLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.optionBtns}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionBtn,
              {
                backgroundColor: selected === opt.value ? colors.primary : colors.muted,
                borderColor: selected === opt.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text
              style={[
                styles.optionBtnText,
                { color: selected === opt.value ? '#fff' : colors.mutedForeground },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Platform.OS === 'web' ? 67 + insets.top : insets.top + 8 },
      ]}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>الإعدادات</Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>وحدات المسافة</Text>
        <OptionRow
          label="وحدة القياس"
          options={[
            { label: 'بحري', value: 'nm' },
            { label: 'كيلومتر', value: 'km' },
            { label: 'ميل', value: 'mi' },
          ]}
          selected={nav.settings.units}
          onSelect={(v) => nav.updateSettings({ units: v as 'nm' | 'km' | 'mi' })}
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>لون مسار التتبع</Text>
        <OptionRow
          label="لون المسار"
          options={[
            { label: 'أحمر', value: 'red' },
            { label: 'أزرق', value: 'blue' },
          ]}
          selected={nav.settings.trackColor}
          onSelect={(v) => nav.updateSettings({ trackColor: v as 'red' | 'blue' })}
        />
        <View style={styles.colorPreview}>
          <View
            style={[
              styles.colorSwatch,
              {
                backgroundColor: nav.settings.trackColor === 'red' ? '#FF3D00' : '#1565C0',
              },
            ]}
          />
          <Text style={[styles.colorLabel, { color: colors.mutedForeground }]}>معاينة المسار</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>التتبع</Text>
        <View style={styles.row}>
          <View>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>حالة التسجيل</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {nav.isTracking ? 'جاري تسجيل المسار' : 'التسجيل متوقف'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: nav.isTracking ? '#FF3D00' : colors.success },
            ]}
            onPress={nav.isTracking ? nav.stopTracking : nav.startTracking}
          >
            <Ionicons name={nav.isTracking ? 'stop' : 'play'} size={16} color="#fff" />
            <Text style={styles.toggleBtnText}>{nav.isTracking ? 'إيقاف' : 'بدء'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <View>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>نقاط المسار</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {nav.trackPoints.length} نقطة مسجلة
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: colors.destructive }]}
            onPress={nav.clearTrack}
          >
            <Text style={[styles.clearBtnText, { color: colors.destructive }]}>مسح</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Marine Navigator</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            يعمل بالكامل بدون إنترنت. الخرائط من ملف MBTiles المحلي.
          </Text>
          <Text style={[styles.infoVersion, { color: colors.mutedForeground }]}>النسخة 1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  card: { borderRadius: 16, padding: 16, gap: 12 },
  cardTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  optionRow: { gap: 8 },
  optionLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  optionBtns: { flexDirection: 'row', gap: 8 },
  optionBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  optionBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  colorPreview: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorSwatch: { width: 40, height: 6, borderRadius: 3 },
  colorLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  toggleBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  clearBtn: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  clearBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  infoCard: { borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12 },
  infoTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  infoText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  infoVersion: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
});
