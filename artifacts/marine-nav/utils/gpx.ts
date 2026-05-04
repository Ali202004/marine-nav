export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  altitude?: number;
}

export interface TrackPointData {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
}

export function generateGPX(
  trackPoints: [number, number][],
  waypoints: Waypoint[],
  trackName: string
): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MarineNavigator"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">`;

  const waypointsXml = waypoints
    .map(
      (wp) =>
        `  <wpt lat="${wp.latitude.toFixed(6)}" lon="${wp.longitude.toFixed(6)}">
    <name>${escapeXml(wp.name)}</name>
    <time>${wp.createdAt}</time>
  </wpt>`
    )
    .join('\n');

  const trackXml =
    trackPoints.length > 0
      ? `  <trk>
    <name>${escapeXml(trackName)}</name>
    <trkseg>
${trackPoints.map((pt) => `      <trkpt lat="${pt[0].toFixed(6)}" lon="${pt[1].toFixed(6)}"></trkpt>`).join('\n')}
    </trkseg>
  </trk>`
      : '';

  return `${header}\n${waypointsXml}\n${trackXml}\n</gpx>`;
}

export function parseGPXWaypoints(content: string): Omit<Waypoint, 'id'>[] {
  const waypoints: Omit<Waypoint, 'id'>[] = [];
  const wptRegex = /<wpt[^>]+lat="([^"]+)"[^>]+lon="([^"]+)"[^>]*>([\s\S]*?)<\/wpt>/g;
  const nameRegex = /<name>([^<]*)<\/name>/;
  const timeRegex = /<time>([^<]*)<\/time>/;
  let match;
  while ((match = wptRegex.exec(content)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const inner = match[3];
    const nameMatch = nameRegex.exec(inner);
    const timeMatch = timeRegex.exec(inner);
    if (!isNaN(lat) && !isNaN(lon)) {
      waypoints.push({
        name: nameMatch ? unescapeXml(nameMatch[1]) : `WPT${waypoints.length + 1}`,
        latitude: lat,
        longitude: lon,
        createdAt: timeMatch ? timeMatch[1] : new Date().toISOString(),
      });
    }
  }
  return waypoints;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

export function generateTrackFileName(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `Track_${date}_${time}.gpx`;
}
