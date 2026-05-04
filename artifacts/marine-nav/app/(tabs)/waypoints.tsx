import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useNavigation } from '@/context/NavigationContext';
import { useColors } from '@/hooks/useColors';
import { formatCoords, formatDistance, haversineDistance } from '@/utils/geo';
import { Waypoint } from '@/utils/gpx';

export default function WaypointsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedWp, setSelectedWp] = useState<Waypoint | null>(null);
  const [newName, setNewName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const gps = nav.gpsLocation;

  const sortedWaypoints = [...nav.waypoints].sort((a, b) => {
    if (!gps) return 0;
    const da = haversineDistance(gps.coords.latitude, gps.coords.longitude, a.latitude, a.longitude);
    const db = haversineDistance(gps.coords.latitude, gps.coords.longitude, b.latitude, b.longitude);
    return da - db;
  });

  const handleExportGPX = async () => {
    const path = await nav.exportGPX();
    if (path) {
      Alert.alert('تم التصدير', `تم حفظ الملف:\n${path}`);
    } else {
      Alert.alert('خطأ', 'فشل تصدير الملف');
    }
  };

  const handleImportGPX = async () => {
    const count = await nav.importGPX();
    if (count > 0) {
      Alert.alert('تم الاستيراد', `تم استيراد ${count} إحداثية`);
    } else if (count === 0) {
      Alert.alert('لا توجد بيانات', 'لم يتم العثور على إحداثيات في الملف');
    }
  };

  const handleDelete = (wp: Waypoint) => {
    Alert.alert('حذف الإحداثية', `هل تريد حذف "${wp.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => nav.deleteWaypoint(wp.id) },
    ]);
  };

  const handleAddManual = () => {
    const lat = parseFloat(manualLat.replace(',', '.'));
    const lng = parseFloat(manualLng.replace(',', '.'));
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('خطأ', 'أدخل إحداثيات صحيحة');
      return;
    }
    nav.saveWaypoint({ name: newName || `WPT${nav.waypoints.length + 1}`, latitude: lat, longitude: lng });
    setShowAddModal(false);
    setManualLat('');
    setManualLng('');
    setNewName('');
  };

  const handleSaveCurrent = () => {
    const name = newName.trim() || `WPT${nav.waypoints.length + 1}`;
    nav.saveCurrentWaypoint(name);
    setShowAddModal(false);
    setNewName('');
  };

  const renderItem = ({ item: wp }: { item: Waypoint }) => {
    const dist = gps
      ? haversineDistance(gps.coords.latitude, gps.coords.longitude, wp.latitude, wp.longitude)
      : null;
    const isDestination = nav.destination?.id === wp.id;

    return (
      <View style={[styles.wpCard, { backgroundColor: colors.card, borderColor: isDestination ? colors.success : colors.border }]}>
        <View style={styles.wpLeft}>
          <View style={[styles.wpIcon, { backgroundColor: isDestination ? `${colors.success}22` : colors.muted }]}>
            <Ionicons name={isDestination ? 'navigate' : 'location'} size={18} color={isDestination ? colors.success : colors.primary} />
          </View>
          <View>
            <Text style={[styles.wpName, { color: colors.foreground }]}>{wp.name}</Text>
            <Text style={[styles.wpCoords, { color: colors.mutedForeground }]}>
              {formatCoords(wp.latitude, wp.longitude)}
            </Text>
            {dist !== null && (
              <Text style={[styles.wpDist, { color: colors.accent }]}>
                {formatDistance(dist, nav.settings.units)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.wpActions}>
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: isDestination ? colors.success : colors.muted }]}
            onPress={() => nav.setDestination(isDestination ? null : wp)}
          >
            <Ionicons name="navigate-outline" size={16} color={isDestination ? '#fff' : colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: colors.muted }]}
            onPress={() => {
              setSelectedWp(wp);
              setNewName(wp.name);
              setShowRenameModal(true);
            }}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: `${colors.destructive}22` }]}
            onPress={() => handleDelete(wp)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8),
        backgroundColor: colors.card,
      }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>الإحداثيات</Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
          {nav.waypoints.length} إحداثية
        </Text>
      </View>

      <View style={[styles.toolbar, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.toolBtn, { backgroundColor: colors.primary }]}
          onPress={() => { setNewName(''); setShowAddModal(true); }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.toolBtnText}>إضافة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, { backgroundColor: colors.secondary }]}
          onPress={handleImportGPX}
        >
          <Ionicons name="download-outline" size={18} color={colors.foreground} />
          <Text style={[styles.toolBtnText, { color: colors.foreground }]}>استيراد GPX</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, { backgroundColor: colors.secondary }]}
          onPress={handleExportGPX}
        >
          <Ionicons name="share-outline" size={18} color={colors.foreground} />
          <Text style={[styles.toolBtnText, { color: colors.foreground }]}>تصدير GPX</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedWaypoints}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="map-marker-off" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد إحداثيات</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              اضغط "إضافة" لحفظ موقعك الحالي أو إدخال إحداثيات يدوياً
            </Text>
          </View>
        }
      />

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>إضافة إحداثية</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="الاسم"
              placeholderTextColor={colors.mutedForeground}
            />
            {gps && (
              <TouchableOpacity
                style={[styles.saveCurrentBtn, { backgroundColor: colors.success }]}
                onPress={handleSaveCurrent}
              >
                <Ionicons name="locate" size={18} color="#fff" />
                <Text style={styles.saveCurrentText}>حفظ الموقع الحالي</Text>
              </TouchableOpacity>
            )}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>أو إدخال يدوي</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={manualLat}
              onChangeText={setManualLat}
              placeholder="خط العرض"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={manualLng}
              onChangeText={setManualLng}
              placeholder="خط الطول"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={{ color: colors.foreground }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddManual}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showRenameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.renameBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>تعديل الاسم</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={{ color: colors.foreground }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (selectedWp && newName.trim()) {
                    nav.renameWaypoint(selectedWp.id, newName.trim());
                  }
                  setShowRenameModal(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>حفظ</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  headerCount: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  toolbar: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  toolBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  listContent: { padding: 12, gap: 8, paddingBottom: 32 },
  wpCard: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  wpLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  wpIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  wpName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  wpCoords: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  wpDist: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  wpActions: { flexDirection: 'row', gap: 6 },
  actionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  renameBox: { borderRadius: 20, padding: 24, margin: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'Inter_500Medium', marginBottom: 10 },
  saveCurrentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 12 },
  saveCurrentText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center' },
});
