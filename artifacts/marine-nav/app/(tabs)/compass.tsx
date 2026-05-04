import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { CompassArrow } from '@/components/CompassArrow';
import { useNavigation } from '@/context/NavigationContext';
import { useColors } from '@/hooks/useColors';
import {
  bearingToCardinal,
  calculateBearing,
  estimateETA,
  formatDistance,
  formatSpeed,
  formatSingleCoord,
  haversineDistance,
  mpsToKnots,
} from '@/utils/geo';

export default function CompassScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  const gps = nav.gpsLocation;
  const heading = nav.activeHeading;
  const magHeading = nav.compassHeading;
  const cogHeading = nav.gpsHeading;
  const speed = gps?.coords.speed ?? 0;
  const knots = mpsToKnots(speed);
  const isMoving = speed > 0.3;

  let destinationBearing: number | null = null;
  let distanceToDestination: number | null = null;

  if (nav.destination && gps) {
    destinationBearing = calculateBearing(
      gps.coords.latitude, gps.coords.longitude,
      nav.destination.latitude, nav.destination.longitude
    );
    distanceToDestination = haversineDistance(
      gps.coords.latitude, gps.coords.longitude,
      nav.destination.latitude, nav.destination.longitude
    );
  }

  const etaStr = distanceToDestination !== null
    ? estimateETA(distanceToDestination, speed)
    : '--:--';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8),
        backgroundColor: colors.card,
      }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>البوصلة</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {isMoving ? 'COG من GPS' : 'المغناطيسي'}
          </Text>
        </View>
        <View style={[styles.gpsBadge, { backgroundColor: nav.isGPSReady ? colors.success : '#FF9800' }]}>
          <Text style={styles.gpsBadgeText}>{nav.satellites} قمر</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current heading display */}
        <View style={styles.headingRow}>
          <HeadingChip
            label="المغناطيسي"
            value={`${Math.round(magHeading).toString().padStart(3,'0')}°`}
            sub={bearingToCardinal(magHeading)}
            color={colors.primary}
          />
          {isMoving && (
            <HeadingChip
              label="COG (GPS)"
              value={`${Math.round(cogHeading).toString().padStart(3,'0')}°`}
              sub={bearingToCardinal(cogHeading)}
              color={colors.success}
              active
            />
          )}
          <HeadingChip
            label="السرعة"
            value={knots.toFixed(1)}
            sub="عقدة"
            color={colors.accent}
          />
        </View>

        {/* Compass Rose */}
        <View style={styles.compassWrap}>
          <CompassArrow
            heading={heading}
            destinationBearing={destinationBearing}
            size={290}
          />
        </View>

        {/* GPS Position */}
        {gps && (
          <View style={[styles.posCard, { backgroundColor: colors.card }]}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.posLat, { color: colors.primary }]}>
                {formatSingleCoord(gps.coords.latitude, true)}
              </Text>
              <Text style={[styles.posLon, { color: colors.primary }]}>
                {formatSingleCoord(gps.coords.longitude, false)}
              </Text>
            </View>
            {gps.coords.altitude != null && (
              <Text style={[styles.altText, { color: colors.mutedForeground }]}>
                {Math.round(gps.coords.altitude)}م
              </Text>
            )}
          </View>
        )}

        {/* Destination Info */}
        {nav.destination ? (
          <View style={[styles.destCard, { backgroundColor: colors.card }]}>
            <View style={styles.destHeader}>
              <Ionicons name="navigate" size={18} color={colors.success} />
              <Text style={[styles.destName, { color: colors.foreground }]} numberOfLines={1}>
                {nav.destination.name}
              </Text>
              <TouchableOpacity onPress={nav.clearDestination}>
                <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.destStats}>
              <DestStat
                label="المسافة"
                value={distanceToDestination !== null
                  ? formatDistance(distanceToDestination, nav.settings.units)
                  : '--'}
                color={colors.primary}
              />
              <DestStat
                label="الاتجاه"
                value={destinationBearing !== null
                  ? `${Math.round(destinationBearing)}° ${bearingToCardinal(destinationBearing)}`
                  : '--'}
                color={colors.gold}
              />
              <DestStat label="ETA" value={etaStr} color={colors.accent} />
              <DestStat
                label="السرعة"
                value={formatSpeed(speed, nav.settings.units)}
                color={colors.success}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.noDestCard, { backgroundColor: colors.card }]}>
            <Ionicons name="flag-outline" size={30} color={colors.mutedForeground} />
            <Text style={[styles.noDestText, { color: colors.mutedForeground }]}>
              حدد وجهة لإظهار الاتجاه
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function HeadingChip({ label, value, sub, color, active }: {
  label: string; value: string; sub: string; color: string; active?: boolean;
}) {
  return (
    <View style={[chipStyles.chip, active && chipStyles.active]}>
      <Text style={[chipStyles.label, { color: '#7A9BBE' }]}>{label}</Text>
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
      <Text style={[chipStyles.sub, { color: '#7A9BBE' }]}>{sub}</Text>
    </View>
  );
}

function DestStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={destStyles.stat}>
      <Text style={destStyles.label}>{label}</Text>
      <Text style={[destStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', flex: 1 },
  active: { backgroundColor: 'rgba(0,230,118,0.08)', borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  label: { fontSize: 10, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  value: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  sub: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 1 },
});

const destStyles = StyleSheet.create({
  stat: { flex: 1, minWidth: '40%', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, margin: 3 },
  label: { color: '#7A9BBE', fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  value: { fontSize: 14, fontFamily: 'Inter_700Bold', textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  gpsBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  gpsBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  content: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 32, paddingTop: 12, gap: 16 },
  headingRow: { flexDirection: 'row', gap: 8, width: '100%' },
  compassWrap: { alignItems: 'center' },
  posCard: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', borderRadius: 14, padding: 12 },
  posLat: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  posLon: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, marginTop: 2 },
  altText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  destCard: { width: '100%', borderRadius: 16, padding: 14, gap: 10 },
  destHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  destName: { flex: 1, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  destStats: { flexDirection: 'row', flexWrap: 'wrap' },
  noDestCard: { width: '100%', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8 },
  noDestText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
