/**
 * Haversine distance in km between two points [lon, lat].
 */
function segmentDistanceKm(a: number[], b: number[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * Total distance of a route in km. Route is array of [lon, lat] coordinates.
 */
export function calculateRouteDistanceKm(route: number[][]): number {
  if (!route || route.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += segmentDistanceKm(route[i - 1], route[i]);
  }
  return total;
}
