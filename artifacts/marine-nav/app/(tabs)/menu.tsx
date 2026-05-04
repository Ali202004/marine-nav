import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useNavigation } from '@/context/NavigationContext';
import { useColors } from '@/hooks/useColors';
import { formatCoords } from '@/utils/geo';

export default function MenuScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const router = useRouter();

  const menuItems = [
    {
      title: 'الأقمار الصناعية',
      subtitle: `${nav.satellites} قمر متصل`,
      icon: 'globe-outline' as const,
      iconLib: 'Ionicons',
      color: nav.isGPSReady ? colors.success : '#FF9800',
      onPress: () => router.push('/satellite'),
    },
    {
      title: 'الإحداثيات',
      subtitle: `${nav.waypoints.length} نقطة محفوظة`,
      icon: 'location-outline' as const,
      iconLib: 'Ionicons',
      color: colors.primary,
      onPress: () => router.push('/(tabs)/waypoints'),
    },
    {
      title: 'الخريطة',
      subtitle: nav.hasMBTiles ? 'خريطة MBTiles محملة' : 'اختر ملف MBTiles',
      icon: 'map-outline' as const,
      iconLib: 'Ionicons',
      color: colors.gold,
      onPress: () => router.push('/map-settings'),
    },
    {
      title: 'الإعدادات',
      subtitle: `الوحدات: ${nav.settings.units === 'nm' ? 'بحري' : nav.settings.units === 'km' ? 'كيلومتر' : 'ميل'}`,
      icon: 'settings-outline' as const,
      iconLib: 'Ionicons',
      color: colors.accent,
      onPress: () => router.push('/settings'),
    },
    {
      title: 'بناء APK',
      subtitle: 'دليل التجميع الكامل',
      icon: 'construct-outline' as const,
      iconLib: 'Ionicons',
      color: colors.gold,
      onPress: () => router.push('/build-guide'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), backgroundColor: colors.card },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>القائمة الرئيسية</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {nav.gpsLocation && (
          <View style={[styles.gpsCard, { backgroundColor: colors.card }]}>
            <View style={styles.gpsCardTop}>
              <View style={[styles.gpsDot, { backgroundColor: nav.isGPSReady ? colors.success : '#FF9800' }]} />
              <Text style={[styles.gpsCardTitle, { color: colors.foreground }]}>موقعك الحالي</Text>
            </View>
            <Text style={[styles.coordsText, { color: colors.primary }]}>
              {formatCoords(nav.gpsLocation.coords.latitude, nav.gpsLocation.coords.longitude)}
            </Text>
            <View style={styles.gpsStats}>
              <View style={styles.gpsStat}>
                <Ionicons name="radio" size={14} color={colors.gold} />
                <Text style={[styles.gpsStatText, { color: colors.foreground }]}>{nav.satellites}</Text>
              </View>
              <View style={styles.gpsStat}>
                <MaterialCommunityIcons name="elevation-rise" size={14} color={colors.primary} />
                <Text style={[styles.gpsStatText, { color: colors.foreground }]}>
                  {nav.gpsLocation.coords.altitude != null
                    ? `${Math.round(nav.gpsLocation.coords.altitude)}م`
                    : '--م'}
                </Text>
              </View>
              <View style={styles.gpsStat}>
                <Ionicons name="speedometer-outline" size={14} color={colors.accent} />
                <Text style={[styles.gpsStatText, { color: colors.foreground }]}>
                  {((nav.gpsLocation.coords.speed ?? 0) * 1.94384).toFixed(1)} عقدة
                </Text>
              </View>
            </View>
          </View>
        )}

        {nav.isTracking && (
          <View style={[styles.trackingBanner, { backgroundColor: '#FF3D0022', borderColor: '#FF3D00' }]}>
            <View style={styles.recDot} />
            <Text style={[styles.trackingText, { color: '#FF3D00' }]}>
              تسجيل المسار نشط • {nav.trackPoints.length} نقطة
            </Text>
          </View>
        )}

        <View style={styles.menuGrid}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuCard, { backgroundColor: colors.card }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon} size={26} color={item.color} />
              </View>
              <Text style={[styles.menuTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {nav.destination && (
          <View style={[styles.destBanner, { backgroundColor: colors.card, borderColor: colors.success }]}>
            <Ionicons name="navigate" size={18} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.destBannerTitle, { color: colors.foreground }]}>وجهة نشطة</Text>
              <Text style={[styles.destBannerName, { color: colors.success }]}>
                {nav.destination.name}
              </Text>
            </View>
            <TouchableOpacity onPress={nav.clearDestination}>
              <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },
  gpsCard: {
    borderRadius: 16, padding: 14, gap: 8,
  },
  gpsCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gpsDot: { width: 10, height: 10, borderRadius: 5 },
  gpsCardTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  coordsText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  gpsStats: { flexDirection: 'row', gap: 16 },
  gpsStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gpsStatText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  trackingBanner: {
    borderRadius: 12, borderWidth: 1, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3D00' },
  trackingText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  menuGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  menuCard: {
    width: '47%',
    borderRadius: 16, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  menuIconWrap: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  menuTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  menuSubtitle: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  destBanner: {
    borderRadius: 14, borderWidth: 1, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  destBannerTitle: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  destBannerName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
