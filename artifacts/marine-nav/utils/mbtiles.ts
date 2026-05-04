import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase | null = null;
let currentPath: string | null = null;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Known paths where the user can manually place their MBTiles file.
 * On a standalone Android APK these are the accessible locations.
 */
export function getMBTilesExpectedPaths(): string[] {
  const base = FileSystem.documentDirectory ?? '';
  const docBase = base.replace('file://', '');
  return [
    // 1. Inside app's own SQLite dir (set after first load via picker)
    `${base}SQLite/map.mbtiles`,
    // 2. App external files dir (accessible in file manager without root)
    `${base}navigation.mbtiles`,
    `${base}chart.mbtiles`,
    `${base}sea.mbtiles`,
  ];
}

/**
 * Returns the user-facing file manager path for the APK's external storage.
 * Example: Android/data/com.marine.navigator/files/
 */
export function getExternalMBTilesPath(): string {
  if (Platform.OS !== 'android') return '';
  // documentDirectory on Android standalone = /data/user/0/<package>/files/
  // The externally accessible path mirrors as:
  return 'Android/data/com.marine.navigator/files/map.mbtiles';
}

/**
 * Auto-scan known paths and open the first MBTiles found.
 * Call this on app startup after loading persisted state.
 */
export async function autoDetectMBTiles(): Promise<string | null> {
  const paths = getMBTilesExpectedPaths();
  for (const p of paths) {
    try {
      const info = await FileSystem.getInfoAsync(p);
      if (info.exists && info.size && info.size > 1000) {
        const ok = await openMBTilesFromPath(p);
        if (ok) return p;
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Open an MBTiles file that is already in the SQLite dir (no copy needed).
 */
async function openMBTilesFromPath(filePath: string): Promise<boolean> {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
    }
    // Get just the filename for SQLite.openDatabaseAsync
    const fileName = filePath.split('/').pop() ?? 'map.mbtiles';
    db = await SQLite.openDatabaseAsync(fileName);
    // Verify it has a tiles table
    const check = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='tiles'"
    );
    if (!check || check.count === 0) {
      await db.closeAsync();
      db = null;
      return false;
    }
    currentPath = filePath;
    return true;
  } catch (e) {
    db = null;
    return false;
  }
}

/**
 * Open MBTiles from any URI (document picker, external, etc).
 * Copies file to SQLite directory first.
 */
export async function openMBTiles(filePath: string): Promise<boolean> {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
      currentPath = null;
    }

    const sqliteDir = (FileSystem.documentDirectory ?? '') + 'SQLite/';
    await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });

    const destPath = sqliteDir + 'map.mbtiles';

    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return false;

    // Only copy if source is different from destination
    if (filePath !== destPath) {
      await FileSystem.copyAsync({ from: filePath, to: destPath });
    }

    db = await SQLite.openDatabaseAsync('map.mbtiles');

    // Validate
    const check = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='tiles'"
    );
    if (!check || check.count === 0) {
      await db.closeAsync();
      db = null;
      return false;
    }

    currentPath = destPath;
    return true;
  } catch (e) {
    console.warn('openMBTiles error:', e);
    db = null;
    return false;
  }
}

export async function getMBTilesMetadata(): Promise<Record<string, string>> {
  if (!db) return {};
  try {
    const rows = await db.getAllAsync<{ name: string; value: string }>(
      'SELECT name, value FROM metadata'
    );
    const meta: Record<string, string> = {};
    for (const r of rows) meta[r.name] = r.value;
    return meta;
  } catch (_) {
    return {};
  }
}

export async function getTile(z: number, x: number, y: number): Promise<string | null> {
  if (!db) return null;
  try {
    const tmsY = (1 << z) - 1 - y;
    const row = await db.getFirstAsync<{ tile_data: Uint8Array | ArrayBuffer | string | null }>(
      'SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?',
      [z, x, tmsY]
    );
    if (!row?.tile_data) return null;
    const data = row.tile_data;
    if (typeof data === 'string') return data;
    if (data instanceof ArrayBuffer) return uint8ArrayToBase64(new Uint8Array(data));
    if (data instanceof Uint8Array) return uint8ArrayToBase64(data);
    return null;
  } catch (_) {
    return null;
  }
}

export async function closeMBTiles(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    currentPath = null;
  }
}

export function isOpen(): boolean {
  return db !== null;
}

export function getCurrentPath(): string | null {
  return currentPath;
}
