"use client";

import { useEffect, useState } from "react";
import { getRouteEnrichment, type EnrichmentResponse } from "@/lib/enrichmentApi";

type CurrentRoute = {
  destination: string;
  type: string;
  path: number[][];
  pathDays?: number[][][];
};

type RouteEnrichmentProps = {
  currentRoute: CurrentRoute | null;
  /** Optional 3-day forecast to send to LLM for richer tips */
  forecast?: Array<{ date: string; tempMin: number | null; tempMax: number | null; precipitation: number | null }>;
  className?: string;
};

export default function RouteEnrichment({
  currentRoute,
  forecast,
  className = "",
}: RouteEnrichmentProps) {
  const [enrichment, setEnrichment] = useState<EnrichmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentRoute?.destination || !currentRoute?.path?.length) {
      setEnrichment(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    getRouteEnrichment({
      destination: currentRoute.destination,
      type: currentRoute.type,
      path: currentRoute.path,
      pathDays: currentRoute.pathDays ?? [],
      forecast,
    })
      .then(setEnrichment)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Enrichment failed");
        setEnrichment(null);
      })
      .finally(() => setIsLoading(false));
  }, [
    currentRoute?.destination,
    currentRoute?.type,
    currentRoute?.path?.length,
    currentRoute?.pathDays?.length,
    forecast?.length,
  ]);

  if (!currentRoute?.destination) return null;

  if (isLoading) {
    return (
      <div
        className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 ${className}`}
      >
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Route insights
        </h3>
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="inline-flex gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500 [animation-delay:0.2s]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500 [animation-delay:0.4s]" />
          </span>
          Enriching…
        </div>
      </div>
    );
  }

  if (error || !enrichment) {
    return (
      <div
        className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 ${className}`}
      >
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Route insights
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {error && error.includes("401")
            ? "Sign in to get route insights."
            : "No enrichment available."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Route insights
        </h3>
        {enrichment.title && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {enrichment.title}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {enrichment.overview && (
          <section>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span aria-hidden>📖</span> Overview
            </h4>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {enrichment.overview}
            </p>
          </section>
        )}

        {enrichment.bestWindows?.length > 0 && (
          <section>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span aria-hidden>⏰</span> Best windows
            </h4>
            <ul className="mt-1.5 list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-0.5">
              {enrichment.bestWindows.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        {enrichment.segments?.length > 0 && (
          <section>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span aria-hidden>🗺️</span> Route segments
            </h4>
            <div className="mt-2 space-y-3">
              {enrichment.segments.map((seg, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3"
                >
                  <h5 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {seg.name}
                  </h5>
                  {seg.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {seg.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {seg.difficulty && (
                      <span className="rounded-md bg-slate-200 dark:bg-slate-600 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                        {seg.difficulty}
                      </span>
                    )}
                    {seg.highlights?.map((h, j) => (
                      <span
                        key={j}
                        className="rounded-md bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 text-xs text-sky-800 dark:text-sky-200"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {enrichment.pois?.length > 0 && (
          <section>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span aria-hidden>📍</span> Points of interest
            </h4>
            <div className="mt-2 space-y-2">
              {enrichment.pois.map((poi, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3"
                >
                  <h5 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {poi.name}
                  </h5>
                  {poi.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {poi.description}
                    </p>
                  )}
                  {poi.type && (
                    <span className="mt-1 inline-block text-xs text-slate-500 dark:text-slate-400">
                      {poi.type}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {enrichment.safety_tips?.length > 0 && (
          <section>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span aria-hidden>⚠️</span> Safety tips
            </h4>
            <ul className="mt-1.5 list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-0.5">
              {enrichment.safety_tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </section>
        )}

        {enrichment.gear_checklist?.length > 0 && (
          <section>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span aria-hidden>🎒</span> Gear checklist
            </h4>
            <ul className="mt-1.5 list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-0.5">
              {enrichment.gear_checklist.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {enrichment.food_stops?.length > 0 && (
          <section>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span aria-hidden>🍽️</span> Food stops
            </h4>
            <div className="mt-2 space-y-2">
              {enrichment.food_stops.map((stop, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3"
                >
                  <h5 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {stop.name}
                  </h5>
                  {stop.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {stop.description}
                    </p>
                  )}
                  {stop.type && (
                    <span className="mt-1 inline-block text-xs text-slate-500 dark:text-slate-400">
                      {stop.type}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {enrichment.photo_spots?.length > 0 && (
          <section>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span aria-hidden>📸</span> Photo spots
            </h4>
            <div className="mt-2 space-y-2">
              {enrichment.photo_spots.map((spot, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3"
                >
                  <h5 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {spot.name}
                  </h5>
                  {spot.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {spot.description}
                    </p>
                  )}
                  {spot.best_time && (
                    <span className="mt-1 inline-block text-xs text-slate-500 dark:text-slate-400">
                      Best: {spot.best_time}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
