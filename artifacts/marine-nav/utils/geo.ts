export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateBearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Format coordinates in Garmin hddd°mm.mmm format
 * Example: N 021°32.151'  E 039°44.510'
 */
export function formatCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const absLat = Math.abs(lat);
  const absLon = Math.abs(lon);
  const latDeg = Math.floor(absLat);
  const latMinRaw = (absLat - latDeg) * 60;
  const lonDeg = Math.floor(absLon);
  const lonMinRaw = (absLon - lonDeg) * 60;
  const latMin = latMinRaw.toFixed(3).padStart(6, '0');
  const lonMin = lonMinRaw.toFixed(3).padStart(6, '0');
  const latDegStr = String(latDeg).padStart(2, '0');
  const lonDegStr = String(lonDeg).padStart(3, '0');
  return `${latDir}${latDegStr}°${latMin}'  ${lonDir}${lonDegStr}°${lonMin}'`;
}

/**
 * Format single coordinate line
 * Example: N 021°32.151'
 */
export function formatSingleCoord(value: number, isLat: boolean): string {
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = ((abs - deg) * 60).toFixed(3).padStart(6, '0');
  const degStr = isLat ? String(deg).padStart(2, '0') : String(deg).padStart(3, '0');
  return `${dir}${degStr}°${min}'`;
}

export function formatDistance(meters: number, units: 'km' | 'nm' | 'mi'): string {
  if (units === 'nm') {
    const nm = meters / 1852;
    return nm < 0.1 ? `${(nm * 1852).toFixed(0)}م` : `${nm.toFixed(2)} NM`;
  }
  if (units === 'mi') {
    const mi = meters / 1609.34;
    return mi < 0.1 ? `${meters.toFixed(0)}م` : `${mi.toFixed(2)} mi`;
  }
  const km = meters / 1000;
  return km < 0.1 ? `${meters.toFixed(0)}م` : `${km.toFixed(2)} km`;
}

export function mpsToKnots(mps: number): number {
  return mps * 1.94384;
}

export function mpsToKmh(mps: number): number {
  return mps * 3.6;
}

export function formatSpeed(mps: number, units: 'km' | 'nm' | 'mi'): string {
  if (units === 'nm') return `${mpsToKnots(mps).toFixed(1)} kts`;
  if (units === 'mi') return `${(mps * 2.23694).toFixed(1)} mph`;
  return `${mpsToKmh(mps).toFixed(1)} km/h`;
}

export function estimateSatellites(accuracy: number | null): number {
  if (!accuracy) return 0;
  if (accuracy <= 3) return 12;
  if (accuracy <= 5) return 10;
  if (accuracy <= 10) return 8;
  if (accuracy <= 20) return 6;
  if (accuracy <= 50) return 4;
  return 2;
}

export function estimateETA(distMeters: number, speedMps: number): string {
  if (speedMps < 0.1) return '--:--';
  const seconds = distMeters / speedMps;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function bearingToCardinal(bearing: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(bearing / 45) % 8];
}
