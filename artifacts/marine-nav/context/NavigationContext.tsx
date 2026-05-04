import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, Platform, Vibration } from 'react-native';

import { estimateSatellites, haversineDistance } from '@/utils/geo';
import { generateGPX, generateTrackFileName, parseGPXWaypoints, Waypoint } from '@/utils/gpx';
import { openMBTiles } from '@/utils/mbtiles';

export interface Settings {
  units: 'km' | 'nm' | 'mi';
  trackColor: 'red' | 'blue';
  anchorAlarmRadius: number; // meters
}

export interface AnchorWatch {
  active: boolean;
  lat: number;
  lng: number;
  radius: number; // meters
  alarming: boolean;
}

interface NavContextType {
  gpsLocation: Location.LocationObject | null;
  compassHeading: number;        // from magnetometer
  gpsHeading: number;            // COG from GPS when moving
  activeHeading: number;         // COG if speed > 0.5kts, else magnetometer
  satellites: number;
  isGPSReady: boolean;
  gpsError: string | null;
  trackPoints: [number, number][];
  isTracking: boolean;
  waypoints: Waypoint[];
  destination: Waypoint | null;
  mbtilesPath: string | null;
  hasMBTiles: boolean;
  settings: Settings;
  anchorWatch: AnchorWatch | null;
  permissionStatus: string;
  // Actions
  saveCurrentWaypoint: (name: string) => void;
  saveWaypoint: (wp: Omit<Waypoint, 'id' | 'createdAt'>) => void;
  deleteWaypoint: (id: string) => void;
  renameWaypoint: (id: string, name: string) => void;
  setDestination: (wp: Waypoint | null) => void;
  clearDestination: () => void;
  pickMBTilesFile: () => Promise<boolean>;
  startTracking: () => void;
  stopTracking: () => void;
  clearTrack: () => void;
  exportGPX: () => Promise<string | null>;
  importGPX: () => Promise<number>;
  updateSettings: (s: Partial<Settings>) => void;
  centerOnGPS: () => { lat: number; lng: number } | null;
  setAnchorHere: (radius?: number) => void;
  clearAnchorWatch: () => void;
  requestGPSPermission: () => Promise<void>;
}

const NavContext = createContext<NavContextType | null>(null);

const WAYPOINTS_KEY = '@marine_waypoints_v2';
const SETTINGS_KEY = '@marine_settings_v2';
const MBTILES_KEY = '@marine_mbtiles_v2';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [gpsLocation, setGpsLocation] = useState<Location.LocationObject | null>(null);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [gpsHeading, setGpsHeading] = useState<number>(0);
  const [satellites, setSatellites] = useState<number>(0);
  const [isGPSReady, setIsGPSReady] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [trackPoints, setTrackPoints] = useState<[number, number][]>([]);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [destination, setDestinationState] = useState<Waypoint | null>(null);
  const [mbtilesPath, setMbtilesPath] = useState<string | null>(null);
  const [hasMBTiles, setHasMBTiles] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings>({
    units: 'nm',
    trackColor: 'red',
    anchorAlarmRadius: 50,
  });
  const [anchorWatch, setAnchorWatch] = useState<AnchorWatch | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const magnetometerSubscription = useRef<ReturnType<typeof Magnetometer.addListener> | null>(null);
  const isTrackingRef = useRef(false);
  const trackPointsRef = useRef<[number, number][]>([]);
  const anchorWatchRef = useRef<AnchorWatch | null>(null);

  useEffect(() => {
    loadPersistedData();
    if (Platform.OS !== 'web') {
      startGPS();
      startCompass();
    }
    return () => {
      locationSubscription.current?.remove();
      magnetometerSubscription.current?.remove();
    };
  }, []);

  // Anchor watch check
  useEffect(() => {
    if (!anchorWatch?.active || !gpsLocation) return;
    const dist = haversineDistance(
      gpsLocation.coords.latitude,
      gpsLocation.coords.longitude,
      anchorWatch.lat,
      anchorWatch.lng
    );
    const drifting = dist > anchorWatch.radius;
    if (drifting !== anchorWatch.alarming) {
      const updated = { ...anchorWatch, alarming: drifting };
      setAnchorWatch(updated);
      anchorWatchRef.current = updated;
      if (drifting) {
        Vibration.vibrate([500, 200, 500, 200, 500], true);
        Alert.alert(
          '⚓ تحذير - انجراف المرساة',
          `المركب انجرف أكثر من ${anchorWatch.radius} متر من موقع المرساة!\nالمسافة الحالية: ${dist.toFixed(0)}م`,
          [{ text: 'إيقاف الإنذار', onPress: () => { Vibration.cancel(); } }]
        );
      } else {
        Vibration.cancel();
      }
    }
  }, [gpsLocation, anchorWatch]);

  async function loadPersistedData() {
    try {
      const [wpsJson, settingsJson, savedMbtiles] = await Promise.all([
        AsyncStorage.getItem(WAYPOINTS_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(MBTILES_KEY),
      ]);
      if (wpsJson) setWaypoints(JSON.parse(wpsJson));
      if (settingsJson) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(settingsJson) }));
      }
      // Try saved path first
      let loaded = false;
      if (savedMbtiles) {
        const info = await FileSystem.getInfoAsync(savedMbtiles);
        if (info.exists) {
          const success = await openMBTiles(savedMbtiles);
          if (success) {
            setMbtilesPath(savedMbtiles);
            setHasMBTiles(true);
            loaded = true;
          }
        }
      }
      // Auto-detect from known paths if not loaded
      if (!loaded) {
        const { autoDetectMBTiles } = await import('@/utils/mbtiles');
        const detected = await autoDetectMBTiles();
        if (detected) {
          setMbtilesPath(detected);
          setHasMBTiles(true);
          await AsyncStorage.setItem(MBTILES_KEY, detected);
        }
      }
    } catch (e) {
      console.warn('loadPersistedData error:', e);
    }
  }

  async function requestGPSPermission() {
    await startGPS();
  }

  async function startGPS() {
    if (Platform.OS === 'web') {
      setGpsError('GPS غير متاح على الويب - استخدم جهاز Android');
      setPermissionStatus('web');
      return;
    }
    try {
      // Check current permission first
      const existing = await Location.getForegroundPermissionsAsync();
      if (existing.status === 'denied') {
        setPermissionStatus('denied');
        setGpsError('تم رفض إذن GPS. اذهب للإعدادات وفعّل الموقع للتطبيق.');
        return;
      }

      // Request permission - shows system dialog
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setGpsError(
          canAskAgain
            ? 'يرجى السماح بالوصول إلى الموقع'
            : 'يرجى تفعيل GPS للتطبيق من إعدادات الجهاز'
        );
        return;
      }

      setGpsError(null);

      // Check if location services are enabled
      const providerStatus = await Location.hasServicesEnabledAsync();
      if (!providerStatus) {
        setGpsError('خدمات الموقع مُعطّلة. فعّلها من إعدادات الجهاز.');
        return;
      }

      // Stop existing subscription
      locationSubscription.current?.remove();

      // Start high-accuracy location watch
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (location) => {
          setGpsLocation(location);

          const acc = location.coords.accuracy;
          const sats = estimateSatellites(acc);
          setSatellites(sats);
          setIsGPSReady(acc !== null && acc <= 15);
          setGpsError(null);

          // GPS heading (Course Over Ground) - only valid when moving
          const speed = location.coords.speed ?? 0;
          const cogHeading = location.coords.heading;
          if (cogHeading !== null && cogHeading >= 0 && speed > 0.3) {
            setGpsHeading(cogHeading);
          }

          // Track recording
          if (isTrackingRef.current) {
            const pt: [number, number] = [
              location.coords.latitude,
              location.coords.longitude,
            ];
            trackPointsRef.current = [...trackPointsRef.current, pt];
            // Update state every 3 points to avoid excessive re-renders
            if (trackPointsRef.current.length % 3 === 0) {
              setTrackPoints([...trackPointsRef.current]);
            }
          }
        }
      );
    } catch (e) {
      const msg = String(e);
      setGpsError('خطأ GPS: ' + msg);
      setPermissionStatus('error');
    }
  }

  function startCompass() {
    if (Platform.OS === 'web') return;
    try {
      Magnetometer.setUpdateInterval(150);
      magnetometerSubscription.current = Magnetometer.addListener(({ x, y }) => {
        // Standard heading calculation
        let angle = Math.atan2(-y, x) * (180 / Math.PI);
        angle = (angle + 360) % 360;
        setCompassHeading(angle);
      });
    } catch (e) {
      console.warn('Magnetometer not available:', e);
    }
  }

  // Active heading: GPS COG when moving fast enough, else magnetic
  const speed = gpsLocation?.coords.speed ?? 0;
  const activeHeading = speed > 0.5 ? gpsHeading : compassHeading;

  function startTracking() {
    isTrackingRef.current = true;
    trackPointsRef.current = gpsLocation
      ? [[gpsLocation.coords.latitude, gpsLocation.coords.longitude]]
      : [];
    setTrackPoints([...trackPointsRef.current]);
    setIsTracking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function stopTracking() {
    isTrackingRef.current = false;
    setTrackPoints([...trackPointsRef.current]);
    setIsTracking(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function clearTrack() {
    isTrackingRef.current = false;
    trackPointsRef.current = [];
    setTrackPoints([]);
    setIsTracking(false);
  }

  function saveCurrentWaypoint(name: string) {
    if (!gpsLocation) return;
    const wp: Waypoint = {
      id: generateId(),
      name,
      latitude: gpsLocation.coords.latitude,
      longitude: gpsLocation.coords.longitude,
      altitude: gpsLocation.coords.altitude ?? undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...waypoints, wp];
    setWaypoints(updated);
    AsyncStorage.setItem(WAYPOINTS_KEY, JSON.stringify(updated));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function saveWaypoint(wp: Omit<Waypoint, 'id' | 'createdAt'>) {
    const newWp: Waypoint = { ...wp, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...waypoints, newWp];
    setWaypoints(updated);
    AsyncStorage.setItem(WAYPOINTS_KEY, JSON.stringify(updated));
  }

  function deleteWaypoint(id: string) {
    const updated = waypoints.filter((w) => w.id !== id);
    setWaypoints(updated);
    AsyncStorage.setItem(WAYPOINTS_KEY, JSON.stringify(updated));
    if (destination?.id === id) setDestinationState(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function renameWaypoint(id: string, name: string) {
    const updated = waypoints.map((w) => (w.id === id ? { ...w, name } : w));
    setWaypoints(updated);
    AsyncStorage.setItem(WAYPOINTS_KEY, JSON.stringify(updated));
  }

  const setDestination = useCallback((wp: Waypoint | null) => {
    setDestinationState(wp);
    if (wp) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const clearDestination = useCallback(() => {
    setDestinationState(null);
  }, []);

  async function pickMBTilesFile(): Promise<boolean> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return false;
      const asset = result.assets[0];
      const success = await openMBTiles(asset.uri);
      if (success) {
        setMbtilesPath(asset.uri);
        setHasMBTiles(true);
        await AsyncStorage.setItem(MBTILES_KEY, asset.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('pickMBTilesFile error:', e);
      return false;
    }
  }

  async function exportGPX(): Promise<string | null> {
    try {
      const gpxContent = generateGPX(trackPointsRef.current, waypoints, 'Marine Track');
      const fileName = generateTrackFileName();
      const filePath = (FileSystem.documentDirectory ?? '') + fileName;
      await FileSystem.writeAsStringAsync(filePath, gpxContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return filePath;
    } catch (e) {
      console.warn('exportGPX error:', e);
      return null;
    }
  }

  async function importGPX(): Promise<number> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return 0;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const parsed = parseGPXWaypoints(content);
      const newWps: Waypoint[] = parsed.map((wp) => ({ ...wp, id: generateId() }));
      const updated = [...waypoints, ...newWps];
      setWaypoints(updated);
      await AsyncStorage.setItem(WAYPOINTS_KEY, JSON.stringify(updated));
      return newWps.length;
    } catch (e) {
      console.warn('importGPX error:', e);
      return 0;
    }
  }

  function updateSettings(s: Partial<Settings>) {
    const updated = { ...settings, ...s };
    setSettings(updated);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }

  function centerOnGPS(): { lat: number; lng: number } | null {
    if (!gpsLocation) return null;
    return {
      lat: gpsLocation.coords.latitude,
      lng: gpsLocation.coords.longitude,
    };
  }

  function setAnchorHere(radius = settings.anchorAlarmRadius) {
    if (!gpsLocation) {
      Alert.alert('خطأ', 'GPS غير جاهز. انتظر إشارة GPS أولاً.');
      return;
    }
    const anchor: AnchorWatch = {
      active: true,
      lat: gpsLocation.coords.latitude,
      lng: gpsLocation.coords.longitude,
      radius,
      alarming: false,
    };
    setAnchorWatch(anchor);
    anchorWatchRef.current = anchor;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function clearAnchorWatch() {
    Vibration.cancel();
    setAnchorWatch(null);
    anchorWatchRef.current = null;
  }

  return (
    <NavContext.Provider
      value={{
        gpsLocation,
        compassHeading,
        gpsHeading,
        activeHeading,
        satellites,
        isGPSReady,
        gpsError,
        trackPoints,
        isTracking,
        waypoints,
        destination,
        mbtilesPath,
        hasMBTiles,
        settings,
        anchorWatch,
        permissionStatus,
        saveCurrentWaypoint,
        saveWaypoint,
        deleteWaypoint,
        renameWaypoint,
        setDestination,
        clearDestination,
        pickMBTilesFile,
        startTracking,
        stopTracking,
        clearTrack,
        exportGPX,
        importGPX,
        updateSettings,
        centerOnGPS,
        setAnchorHere,
        clearAnchorWatch,
        requestGPSPermission,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
