
export type EnrichmentData = {
  destination: string;
  type: string;
  path: number[][];
  pathDays?: number[][][];
  forecast?: Array<{ date: string; tempMin: number | null; tempMax: number | null; precipitation: number | null }>;
};

export type EnrichmentResponse = {
  title: string;
  overview: string;
  bestWindows: string[];
  segments: Array<{ name: string; description: string; difficulty?: string; highlights?: string[] }>;
  pois: Array<{ name: string; type?: string; description: string; coordinates?: number[] }>;
  safety_tips: string[];
  gear_checklist: string[];
  food_stops: Array<{ name: string; type?: string; description: string }>;
  photo_spots: Array<{ name: string; description: string; best_time?: string }>;
};

export async function getRouteEnrichment(
  routeData: EnrichmentData
): Promise<EnrichmentResponse> {
  try {
    const weatherDaily =
      routeData.forecast?.map((d) => ({
        date: d.date,
        tempMin: d.tempMin,
        tempMax: d.tempMax,
        precipitation: d.precipitation,
      })) ?? [];

    const body = {
      destination: routeData.destination,
      type: routeData.type,
      path: routeData.path,
      pathDays: routeData.pathDays ?? [],
      weatherDaily,
    };

    const res = await fetch("/api/llm/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = (data as { message?: string })?.message || `Enrichment failed (${res.status})`;
      if (res.status === 401) {
        console.warn("Enrichment 401: sign in to get route insights.");
      } else {
        console.warn("Enrichment error:", res.status, message);
      }
      throw new Error(message);
    }

    return data as EnrichmentResponse;
  } catch (err) {
    console.error("Error getting route enrichment:", err);
    return {
      title: `${routeData.destination} ${routeData.type} route`,
      overview: `A ${routeData.type} route in ${routeData.destination}. Enjoy your adventure!`,
      bestWindows: [],
      segments: [],
      pois: [],
      safety_tips: [],
      gear_checklist: [],
      food_stops: [],
      photo_spots: [],
    };
  }
}
