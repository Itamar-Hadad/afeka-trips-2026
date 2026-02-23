// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- no types for @mapbox/polyline
// @ts-ignore
import polyline from "@mapbox/polyline";

const MAX_POINTS = 200;

function optimizeRouteForStorage(
  coordinates: number[][],
  maxPoints: number = 50
): number[][] {
  if (coordinates.length <= maxPoints) return coordinates;
  const step = coordinates.length / maxPoints;
  const optimized: number[][] = [];
  for (let i = 0; i < maxPoints; i++) {
    const index = Math.floor(i * step);
    optimized.push(coordinates[index]);
  }
  if (
    optimized[optimized.length - 1] !== coordinates[coordinates.length - 1]
  ) {
    optimized.push(coordinates[coordinates.length - 1]);
  }
  return optimized;
}

function thin(coords: number[][], maxN: number = MAX_POINTS): number[][] {
  if (!coords || coords.length <= maxN) return coords;
  const step = Math.ceil(coords.length / maxN);
  const out: number[][] = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]);
  if (out[out.length - 1] !== coords[coords.length - 1]) {
    out.push(coords[coords.length - 1]);
  }
  return out;
}

function encodeLonLat(coords: number[][]): string {
  if (!coords?.length) return "";
  const thinned = thin(coords);
  return polyline.encode(thinned.map(([lon, lat]) => [lat, lon]));
}

/** Decode polyline string (stored as lat,lng) to [lon, lat][] for app use. */
function decodePath(encoded: string): number[][] {
  if (!encoded?.trim()) return [];
  try {
    const decoded = polyline.decode(encoded) as [number, number][];
    return decoded.map(([lat, lng]) => [lng, lat]);
  } catch {
    return [];
  }
}

/** Route as returned from GET /api/routes (list). */
export type SavedRouteListItem = {
  _id: string;
  name: string;
  description?: string;
  destination?: string;
  type: string;
  pathEncoded: string;
  pathDaysEncoded: string[];
  isSaved: boolean;
  savedAt: string | null;
  lastViewedAt: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Route with decoded path/pathDays for display. */
export type SavedRouteWithPath = SavedRouteListItem & {
  path: number[][];
  pathDays: number[][][];
};

export async function getSavedRoutes(): Promise<SavedRouteListItem[]> {
  const res = await fetch("/api/routes?saved=true", { credentials: "include" });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error((data as { message?: string })?.message || "Failed to fetch routes");
  return Array.isArray(data) ? data : [];
}

export async function getRouteById(id: string): Promise<SavedRouteWithPath | null> {
  const res = await fetch(`/api/routes/${encodeURIComponent(id)}`, { credentials: "include" });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) return null;
  const route = data as SavedRouteListItem;
  const path = decodePath(route.pathEncoded || "");
  const pathDays = (route.pathDaysEncoded || []).map((enc: string) => decodePath(enc)).filter((arr: number[][]) => arr.length >= 2);
  return {
    ...route,
    path: path.length >= 2 ? path : (pathDays[0] || []),
    pathDays: pathDays.length > 0 ? pathDays : (path.length >= 2 ? [path] : []),
  };
}

export async function deleteRoute(id: string): Promise<void> {
  const res = await fetch(`/api/routes/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to delete route");
  }
}

export type RouteDataForSave = {
  name: string;
  description: string;
  destination: string;
  type: string;
  path: number[][];
  pathDays?: number[][][];
};

export async function saveRouteToServer(
  routeData: RouteDataForSave
): Promise<{ message: string; route?: unknown }> {
  const optimizedPath = optimizeRouteForStorage(routeData.path, 50);
  const optimizedPathDays = (routeData.pathDays || []).map((day) =>
    optimizeRouteForStorage(day, 50)
  );

  const pathEncoded = encodeLonLat(thin(optimizedPath, 200));
  const pathDaysEncoded = optimizedPathDays.map((d) =>
    encodeLonLat(thin(d, 200))
  );

  const payload = {
    name: routeData.name,
    description: routeData.description,
    destination: routeData.destination,
    type: routeData.type,
    pathEncoded,
    pathDaysEncoded,
  };

  const postOnce = async (body: string) => {
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(
        (data as { message?: string })?.message || `${res.status} ${res.statusText}`
      ) as Error & { status?: number; data?: unknown };
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data as { message: string; route?: unknown };
  };

  const json = JSON.stringify(payload);

  try {
    return await postOnce(json);
  } catch (e) {
    const err = e as Error & { status?: number; data?: unknown };
    if (err.status === 413) {
      const pathEncoded2 = encodeLonLat(thin(routeData.path, 100));
      const pathDaysEncoded2 = (routeData.pathDays || []).map((d) =>
        encodeLonLat(thin(d, 100))
      );
      const body2 = JSON.stringify({
        ...payload,
        pathEncoded: pathEncoded2,
        pathDaysEncoded: pathDaysEncoded2,
      });
      return await postOnce(body2);
    }
    if (err.status === 429 || (err.status && err.status >= 500)) {
      await new Promise((r) => setTimeout(r, 600));
      return await postOnce(json);
    }
    throw e;
  }
}
