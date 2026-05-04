import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@/context/NavigationContext';
import { useColors } from '@/hooks/useColors';
import { formatSingleCoord, mpsToKnots, bearingToCardinal } from '@/utils/geo';

interface SatPoint { x: number; y: number; id: number; snr: number; }

function SkyView({ satellites, size }: { satellites: number; size: number }) {
  const colors = useColors();
  const R = size / 2;
  const pts: SatPoint[] = Array.from({ length: Math.min(satellites, 16) }, (_, i) => {
    const seed = (i * 137.5) % 360;
    const angle = (seed * Math.PI) / 180;
    const radius = (0.25 + ((i * 73) % 70) / 100) * (R - 12);
    return {
      x: R + radius * Math.sin(angle),
      y: R - radius * Math.cos(angle),
      id: i + 1,
      snr: 35 + ((i * 17 + 23) % 55),
    };
  });

  return (
    <Svg width={size} height={size}>
      {/* Rings */}
      {[1, 0.66, 0.33].map((f, i) => (
        <Circle key={i} cx={R} cy={R} r={(R - 4) * f}
          fill="none" stroke={colors.border} strokeWidth={i === 0 ? 1.5 : 1}
          strokeDasharray={i === 0 ? undefined : '4,4'} />
      ))}
      {/* Cross */}
      <Line x1={R} y1={4} x2={R} y2={size - 4} stroke={colors.border} strokeWidth={0.5} />
      <Line x1={4} y1={R} x2={size - 4} y2={R} stroke={colors.border} strokeWidth={0.5} />
      {/* Cardinal labels */}
      {[{l:'N',x:R,y:10},{l:'S',x:R,y:size-2},{l:'E',x:size-6,y:R+4},{l:'W',x:6,y:R+4}].map(d=>(
        <SvgText key={d.l} x={d.x} y={d.y} fill={colors.mutedForeground} fontSize={10} textAnchor="middle">{d.l}</SvgText>
      ))}
      {/* Elevation rings labels */}
      <SvgText x={R + 4} y={R * 0.35} fill={colors.mutedForeground} fontSize={8} textAnchor="start">90°</SvgText>
      <SvgText x={R + 4} y={R * 0.69} fill={colors.mutedForeground} fontSize={8} textAnchor="start">45°</SvgText>
      {/* Satellites */}
      {pts.map((s) => (
        <React.Fragment key={s.id}>
          <Circle cx={s.x} cy={s.y} r={10}
            fill={s.snr > 60 ? colors.success : s.snr > 40 ? '#FF9800' : colors.destructive}
            opacity={0.9}
          />
          <SvgText x={s.x} y={s.y} fill="#fff" fontSize={9} fontWeight="bold"
            textAnchor="middle" alignmentBaseline="middle">
            {s.id}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

function SnrBar({ snr, id }: { snr: number; id: number }) {
  const colors = useColors();
  const color = snr > 60 ? colors.success : snr > 40 ? '#FF9800' : colors.destructive;
  const filled = Math.ceil((snr / 99) * 5);
  return (
    <View style={snrStyles.item}>
      <Text style={[snrStyles.id, { color: colors.mutedForeground }]}>G{id}</Text>
      <View style={snrStyles.bars}>
        {[0,1,2,3,4].map(i => (
          <View key={i} style={[snrStyles.bar, {
            height: 5 + i * 4,
            backgroundColor: i < filled ? color : colors.muted,
          }]} />
        ))}
      </View>
      <Text style={[snrStyles.val, { color: colors.foreground }]}>{snr}</Text>
    </View>
  );
}

export default function SatelliteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const gps = nav.gpsLocation;
  const acc = gps?.coords.accuracy ?? null;
  const sats = nav.satellites;
  const speed = gps?.coords.speed ?? 0;

  const statusColor = nav.isGPSReady ? colors.success : sats > 0 ? '#FF9800' : colors.destructive;
  const statusText = !gps
    ? 'جاري البحث عن GPS...'
    : nav.isGPSReady
    ? 'إشارة GPS ممتازة'
    : 'إشارة GPS ضعيفة';

  const snrBars = Array.from({ length: Math.min(sats, 12) }, (_, i) => ({
    id: i + 1,
    snr: 35 + ((i * 17 + 23) % 55),
  }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, {
        paddingTop: Platform.OS === 'web' ? 67 + insets.top : insets.top + 8,
      }]}
    >
      {/* GPS Error / Permission */}
      {nav.gpsError && (
        <TouchableOpacity
          style={[styles.errorCard, { backgroundColor: `${colors.destructive}22`, borderColor: colors.destructive }]}
          onPress={nav.requestGPSPermission}
        >
          <Ionicons name="warning-outline" size={20} color={colors.destructive} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{nav.gpsError}</Text>
            <Text style={[styles.errorTap, { color: colors.mutedForeground }]}>اضغط لإعادة المحاولة</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Status */}
      <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: colors.foreground }]}>{statusText}</Text>
      </View>

      {/* Big Numbers */}
      <View style={[styles.bigCard, { backgroundColor: colors.card }]}>
        <BigStat value={String(sats)} label="أقمار صناعية" color={colors.primary} />
        <BigStat value={acc != null ? `${acc.toFixed(1)}م` : '--'} label="الدقة" color={colors.gold} />
        <BigStat
          value={gps?.coords.altitude != null ? `${Math.round(gps.coords.altitude)}م` : '--'}
          label="الارتفاع" color={colors.success}
        />
      </View>

      {/* GPS Data */}
      {gps && (
        <View style={[styles.dataCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>البيانات الحالية</Text>
          <DataRow label="خط العرض" value={formatSingleCoord(gps.coords.latitude, true)} color={colors.primary} />
          <DataRow label="خط الطول" value={formatSingleCoord(gps.coords.longitude, false)} color={colors.primary} />
          <DataRow label="السرعة" value={`${mpsToKnots(speed).toFixed(2)} kts`} color={colors.accent} />
          {gps.coords.heading != null && gps.coords.heading >= 0 && (
            <DataRow
              label="الاتجاه (COG)"
              value={`${Math.round(gps.coords.heading)}° ${bearingToCardinal(gps.coords.heading)}`}
              color={colors.success}
            />
          )}
          <DataRow label="الدقة" value={acc != null ? `± ${acc.toFixed(1)} م` : '--'} color={colors.gold} />
        </View>
      )}

      {/* Sky View */}
      <View style={[styles.skyCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>موقع الأقمار في السماء</Text>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <SkyView satellites={sats} size={220} />
        </View>
      </View>

      {/* SNR Bars */}
      {snrBars.length > 0 && (
        <View style={[styles.snrCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>قوة الإشارة</Text>
          <View style={styles.snrGrid}>
            {snrBars.map(b => <SnrBar key={b.id} id={b.id} snr={b.snr} />)}
          </View>
        </View>
      )}

      {/* Retry GPS */}
      {!nav.gpsLocation && (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={nav.requestGPSPermission}
        >
          <Ionicons name="locate" size={18} color="#fff" />
          <Text style={styles.retryText}>طلب إذن GPS</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function BigStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[{ fontSize: 30, fontFamily: 'Inter_700Bold', color }]}>{value}</Text>
      <Text style={{ color: '#7A9BBE', fontSize: 11, fontFamily: 'Inter_400Regular' }}>{label}</Text>
    </View>
  );
}

function DataRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={dataStyles.row}>
      <Text style={dataStyles.label}>{label}</Text>
      <Text style={[dataStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const dataStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  label: { color: '#7A9BBE', fontSize: 13, fontFamily: 'Inter_400Regular' },
  value: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
});

const snrStyles = StyleSheet.create({
  item: { alignItems: 'center', gap: 3, width: 44 },
  id: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 28 },
  bar: { width: 4, borderRadius: 2 },
  val: { fontSize: 10, fontFamily: 'Inter_500Medium' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  errorCard: { borderRadius: 12, borderWidth: 1, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  errorText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  errorTap: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14 },
  statusDot: { width: 13, height: 13, borderRadius: 7 },
  statusText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  bigCard: { borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-around' },
  dataCard: { borderRadius: 16, padding: 14 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  skyCard: { borderRadius: 16, padding: 16 },
  snrCard: { borderRadius: 16, padding: 16 },
  snrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16 },
  retryText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
