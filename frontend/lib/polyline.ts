/**
 * Encode coordinates to Google/Mapbox polyline string.
 * Input: array of [lat, lng] (or [y, x]). Output: encoded string.
 */
function encodeValue(value: number): string {
  let num = Math.round(value * 1e5);
  num = num < 0 ? ~(num << 1) : num << 1;
  let out = "";
  while (num >= 0x20) {
    out += String.fromCharCode(((num & 0x1f) | 0x20) + 63);
    num >>= 5;
  }
  out += String.fromCharCode(num + 63);
  return out;
}

/**
 * Encode array of [lat, lng] to polyline string.
 */
export function encodePolyline(coords: number[][]): string {
  if (!coords?.length) return "";
  let prevLat = 0;
  let prevLng = 0;
  let result = "";
  for (const [lat, lng] of coords) {
    result += encodeValue(lat - prevLat);
    result += encodeValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return result;
}

/** Thin array to at most maxPoints (keep first, last, and evenly spaced). */
export function thinCoords<T>(arr: T[], maxPoints: number): T[] {
  if (!arr?.length || arr.length <= maxPoints) return arr;
  const step = (arr.length - 1) / (maxPoints - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const index = i === maxPoints - 1 ? arr.length - 1 : Math.floor(i * step);
    out.push(arr[index]);
  }
  return out;
}

/**
 * Encode path [lon, lat][] to polyline string (converts to [lat, lon] for encoding).
 */
export function encodePathLonLat(path: number[][]): string {
  if (!path?.length) return "";
  const thinned = thinCoords(path, 300);
  const latLng = thinned.map(([lon, lat]) => [lat, lon]);
  return encodePolyline(latLng);
}

/**
 * Encode pathDays (array of [lon, lat][]) to array of polyline strings.
 */
export function encodePathDaysLonLat(pathDays: number[][][]): string[] {
  if (!pathDays?.length) return [];
  return pathDays.map((day) => encodePathLonLat(day));
}
