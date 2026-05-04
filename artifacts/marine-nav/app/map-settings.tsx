import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useNavigation } from '@/context/NavigationContext';
import { useColors } from '@/hooks/useColors';
import { getMBTilesMetadata, getExternalMBTilesPath } from '@/utils/mbtiles';

export default function MapSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const router = useRouter();
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  const externalPath = getExternalMBTilesPath();

  useEffect(() => {
    if (nav.hasMBTiles) {
      getMBTilesMetadata().then(setMeta);
    }
  }, [nav.hasMBTiles]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const path = await nav.exportGPX();
      if (path) {
        const fileName = path.split('/').slice(-1)[0];
        Alert.alert('تم التصدير ✓', `تم حفظ الملف:\n${fileName}\n\nيمكن مشاركته عبر أي تطبيق.`);
      } else {
        Alert.alert('خطأ', 'لم يتم التصدير. تأكد من وجود نقاط مسار.');
      }
    } finally {
      setExporting(false);
    }
  };

  const copyPath = (path: string) => {
    Alert.alert('مسار الملف', path, [{ text: 'حسناً', style: 'default' }]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Platform.OS === 'web' ? 67 + insets.top : insets.top + 8 },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>إعدادات الخريطة</Text>
      </View>

      {/* MBTiles Status */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>ملف الخريطة Offline</Text>

        <View style={[styles.fileStatus, {
          backgroundColor: nav.hasMBTiles ? `${colors.success}18` : `${colors.destructive}18`,
          borderColor: nav.hasMBTiles ? `${colors.success}40` : `${colors.destructive}40`,
        }]}>
          <MaterialCommunityIcons
            name={nav.hasMBTiles ? 'map-check' : 'map-off'}
            size={36}
            color={nav.hasMBTiles ? colors.success : colors.destructive}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.fileStatusTitle, {
              color: nav.hasMBTiles ? colors.success : colors.destructive,
            }]}>
              {nav.hasMBTiles ? '✓ خريطة MBTiles محملة' : 'لا توجد خريطة محملة'}
            </Text>
            {nav.mbtilesPath && (
              <Text style={[styles.fileStatusPath, { color: colors.mutedForeground }]} numberOfLines={2}>
                {nav.mbtilesPath.split('/').slice(-1)[0]}
              </Text>
            )}
          </View>
        </View>

        {/* MBTiles Metadata */}
        {nav.hasMBTiles && Object.keys(meta).length > 0 && (
          <View style={[styles.metaBox, { backgroundColor: colors.muted }]}>
            {meta.name && <MetaRow label="الاسم" value={meta.name} />}
            {meta.description && <MetaRow label="الوصف" value={meta.description} />}
            {meta.minzoom && meta.maxzoom && (
              <MetaRow label="مستويات التكبير" value={`${meta.minzoom} → ${meta.maxzoom}`} />
            )}
            {meta.bounds && <MetaRow label="الحدود" value={meta.bounds} />}
            {meta.format && <MetaRow label="الصيغة" value={meta.format.toUpperCase()} />}
          </View>
        )}

        <TouchableOpacity
          style={[styles.pickBtn, { backgroundColor: colors.primary }]}
          onPress={nav.pickMBTilesFile}
        >
          <MaterialCommunityIcons name="folder-open-outline" size={20} color="#fff" />
          <Text style={styles.pickBtnText}>
            {nav.hasMBTiles ? 'تغيير ملف MBTiles' : 'اختيار ملف MBTiles'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* File Path Info */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>أين تضع ملف الخريطة؟</Text>

        <View style={[styles.pathCard, { backgroundColor: '#0B1E35', borderColor: '#1E3D60' }]}>
          <View style={styles.pathHeader}>
            <Ionicons name="folder-outline" size={18} color={colors.gold} />
            <Text style={[styles.pathLabel, { color: colors.gold }]}>المسار في مدير الملفات</Text>
          </View>
          <Text style={[styles.pathText, { color: '#7FC4FD' }]}>
            {externalPath || 'Android/data/com.marine.navigator/files/map.mbtiles'}
          </Text>
          <TouchableOpacity
            style={[styles.copyBtn, { backgroundColor: '#1E3D60' }]}
            onPress={() => copyPath(externalPath || 'Android/data/com.marine.navigator/files/map.mbtiles')}
          >
            <Ionicons name="copy-outline" size={14} color={colors.primary} />
            <Text style={[styles.copyBtnText, { color: colors.primary }]}>نسخ المسار</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.stepsBox, { backgroundColor: colors.muted }]}>
          <Text style={[styles.stepsTitle, { color: colors.foreground }]}>خطوات وضع الملف يدوياً:</Text>
          {[
            'افتح مدير الملفات على هاتفك',
            'اذهب إلى: Android/data/com.marine.navigator/files/',
            'انسخ ملف .mbtiles إلى هذا المجلد',
            'سمّه: map.mbtiles',
            'أغلق التطبيق وأعد فتحه — سيُحمَّل تلقائياً',
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.muted }]}>
          <Ionicons name="bulb-outline" size={16} color={colors.gold} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            الطريقة الأسهل: استخدم زر "اختيار ملف MBTiles" أعلاه لاختيار الملف من أي مكان في الهاتف مباشرة.
          </Text>
        </View>
      </View>

      {/* مصادر الخرائط البحرية */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>مصادر الخرائط البحرية</Text>
        {[
          {
            name: 'OpenSeaMap',
            url: 'tiles.openseamap.org',
            desc: 'خرائط بحرية مفتوحة - إشارات وعلامات الملاحة',
            color: '#1565C0',
          },
          {
            name: 'MapTiler',
            url: 'cloud.maptiler.com',
            desc: 'تصدير خرائط MBTiles لأي منطقة',
            color: '#00695C',
          },
          {
            name: 'NOAA Nautical Charts',
            url: 'nauticalcharts.noaa.gov',
            desc: 'خرائط بحرية رسمية أمريكية مجانية',
            color: '#1565C0',
          },
          {
            name: 'OpenStreetMap + Maperitive',
            url: 'maperitive.net',
            desc: 'تصدير خرائط offline لأي منطقة',
            color: '#558B2F',
          },
        ].map((src, i) => (
          <View key={i} style={[styles.sourceRow, { borderColor: colors.border }]}>
            <View style={[styles.sourceDot, { backgroundColor: src.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sourceName, { color: colors.foreground }]}>{src.name}</Text>
              <Text style={[styles.sourceUrl, { color: colors.primary }]}>{src.url}</Text>
              <Text style={[styles.sourceDesc, { color: colors.mutedForeground }]}>{src.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Export Track */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>تصدير المسار</Text>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.secondary, opacity: exporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Ionicons name="share-outline" size={20} color={colors.foreground} />
          <View>
            <Text style={[styles.exportBtnTitle, { color: colors.foreground }]}>
              {exporting ? 'جاري التصدير...' : 'تصدير المسار كـ GPX'}
            </Text>
            <Text style={[styles.exportBtnSub, { color: colors.mutedForeground }]}>
              {nav.trackPoints.length} نقطة مسجلة
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: '#7A9BBE', fontSize: 12, fontFamily: 'Inter_400Regular' }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: 'Inter_600SemiBold', maxWidth: '60%', textAlign: 'right' }} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  backBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  card: { borderRadius: 16, padding: 16, gap: 12 },
  cardTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  fileStatus: {
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1,
  },
  fileStatusTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  fileStatusPath: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  metaBox: { borderRadius: 10, padding: 12, gap: 2 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, justifyContent: 'center' },
  pickBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  pathCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 10 },
  pathHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pathLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  pathText: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.3, lineHeight: 20 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, alignSelf: 'flex-start' },
  copyBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  stepsBox: { borderRadius: 12, padding: 14, gap: 10 },
  stepsTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  stepText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  infoBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  sourceRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, alignItems: 'flex-start' },
  sourceDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  sourceName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sourceUrl: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  sourceDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 17 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  exportBtnTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  exportBtnSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
