import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { useNavigation } from '@/context/NavigationContext';
import { useColors } from '@/hooks/useColors';
import {
  bearingToCardinal,
  calculateBearing,
  estimateETA,
  formatDistance,
  formatSpeed,
  haversineDistance,
} from '@/utils/geo';
import { Waypoint } from '@/utils/gpx';

export default function DestinationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [showManual, setShowManual] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualName, setManualName] = useState('وجهة جديدة');

  const arrowRotation = useSharedValue(0);

  const gps = nav.gpsLocation;
  const dest = nav.destination;

  let destinationBearing = 0;
  let distanceToDestination = 0;
  let arrowAngle = 0;

  if (dest && gps) {
    destinationBearing = calculateBearing(
      gps.coords.latitude, gps.coords.longitude,
      dest.latitude, dest.longitude
    );
    distanceToDestination = haversineDistance(
      gps.coords.latitude, gps.coords.longitude,
      dest.latitude, dest.longitude
    );
    arrowAngle = (destinationBearing - nav.compassHeading + 360) % 360;
  }

  useEffect(() => {
    arrowRotation.value = withTiming(arrowAngle, { duration: 300 });
  }, [arrowAngle]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }],
  }));

  const speed = gps?.coords.speed ?? 0;
  const speedStr = formatSpeed(speed, nav.settings.units);
  const eta = dest && gps ? estimateETA(distanceToDestination, speed) : '--:--';

  const handleManualSet = () => {
    const lat = parseFloat(manualLat.replace(',', '.'));
    const lng = parseFloat(manualLng.replace(',', '.'));
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('خطأ', 'إحداثيات غير صحيحة');
      return;
    }
    nav.setDestination({
      id: 'manual',
      name: manualName || 'وجهة يدوية',
      latitude: lat,
      longitude: lng,
      createdAt: new Date().toISOString(),
    });
    setShowManual(false);
    setManualLat('');
    setManualLng('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), backgroundColor: colors.card },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>الوجهة</Text>
        {dest && (
          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: colors.destructive }]}
            onPress={nav.clearDestination}
          >
            <Ionicons name="close" size={16} color="#fff" />
            <Text style={styles.clearBtnText}>إلغاء</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {dest ? (
          <View style={styles.activeDestContainer}>
            <View style={[styles.arrowContainer, { backgroundColor: colors.card }]}>
              <Animated.View style={[styles.arrowWrapper, arrowStyle]}>
                <View style={[styles.arrowHead, { borderBottomColor: colors.success }]} />
                <View style={[styles.arrowBody, { backgroundColor: colors.success }]} />
                <View style={[styles.arrowTail, { borderTopColor: colors.destructive }]} />
              </Animated.View>
              <View style={[styles.arrowCenter, { backgroundColor: colors.primary }]} />
            </View>

            <View style={[styles.statsGrid, { gap: 12 }]}>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="map-marker-distance" size={24} color={colors.primary} />
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>المسافة</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {formatDistance(distanceToDestination, nav.settings.units)}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Ionicons name="compass-outline" size={24} color={colors.gold} />
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>الاتجاه</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {Math.round(destinationBearing)}° {bearingToCardinal(destinationBearing)}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="speedometer" size={24} color={colors.accent} />
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>السرعة</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{speedStr}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Ionicons name="time-outline" size={24} color={colors.success} />
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>الوقت المتبقي</Text>
                <Text style={[styles.statValue, { color: colors.accent }]}>{eta}</Text>
              </View>
            </View>

            <View style={[styles.destNameCard, { backgroundColor: colors.card }]}>
              <Ionicons name="flag" size={18} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.destName, { color: colors.foreground }]}>{dest.name}</Text>
                <Text style={[styles.destCoords, { color: colors.mutedForeground }]}>
                  {dest.latitude.toFixed(5)}, {dest.longitude.toFixed(5)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noDestContainer}>
            <View style={[styles.noDestIcon, { backgroundColor: colors.card }]}>
              <Ionicons name="navigate-outline" size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.noDestTitle, { color: colors.foreground }]}>حدد وجهتك</Text>
            <Text style={[styles.noDestSub, { color: colors.mutedForeground }]}>
              اختر وجهة من قائمة الإحداثيات المحفوظة أو أدخل إحداثيات يدوياً
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowManual(true)}
          >
            <Ionicons name="keypad-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>إدخال يدوي</Text>
          </TouchableOpacity>
        </View>

        {nav.waypoints.length > 0 && (
          <View style={styles.waypointsList}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              الإحداثيات المحفوظة
            </Text>
            {nav.waypoints.map((wp) => {
              const dist =
                gps
                  ? haversineDistance(gps.coords.latitude, gps.coords.longitude, wp.latitude, wp.longitude)
                  : null;
              const isActive = dest?.id === wp.id;
              return (
                <TouchableOpacity
                  key={wp.id}
                  style={[
                    styles.wpItem,
                    {
                      backgroundColor: isActive ? `${colors.success}22` : colors.card,
                      borderColor: isActive ? colors.success : colors.border,
                    },
                  ]}
                  onPress={() => nav.setDestination(wp)}
                >
                  <Ionicons
                    name={isActive ? 'checkmark-circle' : 'location-outline'}
                    size={20}
                    color={isActive ? colors.success : colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.wpName, { color: colors.foreground }]}>{wp.name}</Text>
                    {dist !== null && (
                      <Text style={[styles.wpDist, { color: colors.mutedForeground }]}>
                        {formatDistance(dist, nav.settings.units)}
                      </Text>
                    )}
                  </View>
                  {isActive && (
                    <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
                      <Text style={styles.activeBadgeText}>نشط</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={showManual} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>إدخال إحداثيات</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={manualName}
              onChangeText={setManualName}
              placeholder="اسم الوجهة"
              placeholderTextColor={colors.mutedForeground}
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={manualLat}
              onChangeText={setManualLat}
              placeholder="خط العرض (مثال: 15.5321)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={manualLng}
              onChangeText={setManualLng}
              placeholder="خط الطول (مثال: 42.7451)"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setShowManual(false)}
              >
                <Text style={{ color: colors.foreground }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.success }]}
                onPress={handleManualSet}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>تعيين</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  clearBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  activeDestContainer: { alignItems: 'center', padding: 16, gap: 16 },
  arrowContainer: {
    width: 180, height: 180, borderRadius: 90,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  arrowWrapper: { width: 80, height: 160, alignItems: 'center', justifyContent: 'center' },
  arrowHead: {
    width: 0, height: 0,
    borderLeftWidth: 20, borderRightWidth: 20, borderBottomWidth: 55,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#00E676',
  },
  arrowBody: { width: 8, height: 40 },
  arrowTail: {
    width: 0, height: 0,
    borderLeftWidth: 20, borderRightWidth: 20, borderTopWidth: 45,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#FF3D00',
  },
  arrowCenter: {
    position: 'absolute', width: 16, height: 16, borderRadius: 8,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', width: '100%',
  },
  statCard: {
    flex: 1, minWidth: '45%',
    borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6, margin: 4,
  },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  statValue: { fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  destNameCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', borderRadius: 14, padding: 14,
  },
  destName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  destCoords: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  noDestContainer: { alignItems: 'center', padding: 32, gap: 12 },
  noDestIcon: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  noDestTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  noDestSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  waypointsList: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  wpItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1,
  },
  wpName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  wpDist: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  activeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 16, textAlign: 'center' },
  input: {
    borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15,
    fontFamily: 'Inter_500Medium', marginBottom: 10,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center' },
});
