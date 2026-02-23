"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { calculateRouteDistanceKm } from "@/lib/geo-utils";
import {
  getSavedRoutes,
  getRouteById,
  deleteRoute,
  type SavedRouteListItem,
  type SavedRouteWithPath,
} from "@/lib/routesApi";
import WeatherForecast from "@/components/WeatherForecast";

const MapWithRoute = dynamic(() => import("@/components/MapWithRoute"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[280px] text-slate-500 dark:text-slate-400 text-sm">
      Loading map…
    </div>
  ),
});

const DAY_COLORS = ["#2563eb", "#ea580c", "#16a34a"];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function RouteHistoryPage() {
  const [routes, setRoutes] = useState<SavedRouteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<SavedRouteWithPath | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const [hoveredRouteIndex, setHoveredRouteIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError("");
    getSavedRoutes()
      .then((list) => {
        if (!cancelled) setRoutes(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load routes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewRoute = async (id: string) => {
    setLoadingView(true);
    setSelectedRoute(null);
    setHoveredRouteIndex(null);
    try {
      const route = await getRouteById(id);
      setSelectedRoute(route ?? null);
    } catch {
      setError("Failed to load route");
    } finally {
      setLoadingView(false);
    }
  };

  const handleBackToList = () => {
    setSelectedRoute(null);
  };

  const handleDeleteRoute = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this route?")) return;
    setDeletingId(id);
    setError("");
    try {
      await deleteRoute(id);
      setRoutes((prev) => prev.filter((r) => r._id !== id));
      if (selectedRoute?._id === id) setSelectedRoute(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete route");
    } finally {
      setDeletingId(null);
    }
  };

  if (selectedRoute) {
    const optionCount = selectedRoute.pathDays?.length ?? 0;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleBackToList}
              className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              ← Back to saved routes
            </button>
            <button
              type="button"
              onClick={() => selectedRoute._id && handleDeleteRoute(selectedRoute._id)}
              disabled={deletingId === selectedRoute._id}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-60"
            >
              {deletingId === selectedRoute._id ? "Deleting…" : "Delete this route"}
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 md:p-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              {selectedRoute.name}
            </h2>
            {selectedRoute.description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {selectedRoute.description}
              </p>
            )}
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {selectedRoute.destination} — {selectedRoute.type === "hike"
                ? `${optionCount} option(s) (1 day)`
                : `${optionCount} day(s)`}
            </p>
            {selectedRoute.pathDays && selectedRoute.pathDays.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {selectedRoute.pathDays.map((dayRoute, index) => {
                  const km = calculateRouteDistanceKm(dayRoute);
                  const label = selectedRoute.type === "hike"
                    ? `Option ${index + 1}`
                    : `Day ${index + 1}`;
                  const color = DAY_COLORS[index % DAY_COLORS.length];
                  const isHovered = hoveredRouteIndex === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onMouseEnter={() => setHoveredRouteIndex(index)}
                      onMouseLeave={() => setHoveredRouteIndex(null)}
                      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all cursor-pointer border ${isHovered ? "border-2" : "border-slate-200 dark:border-slate-600"}`}
                      style={{
                        backgroundColor: isHovered ? `${color}40` : undefined,
                        borderLeftColor: color,
                        borderLeftWidth: 4,
                        borderColor: isHovered ? color : undefined,
                      }}
                    >
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      {label}: {km.toFixed(1)} km
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Saved {formatDate(selectedRoute.savedAt)}
            </p>
            <MapWithRoute
              path={selectedRoute.path}
              pathDays={selectedRoute.pathDays}
              selectedIndex={hoveredRouteIndex}
              className="mt-6 w-full"
            />
            {selectedRoute.path?.length > 0 && Array.isArray(selectedRoute.path[0]) && selectedRoute.path[0].length >= 2 && (
              <WeatherForecast
                lat={selectedRoute.path[0][1]}
                lon={selectedRoute.path[0][0]}
                className="mt-4 w-full"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Route history
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
            Your saved routes
          </p>
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading saved routes…</p>
          </div>
        )}

        {loadingView && (
          <div className="flex flex-col items-center justify-center py-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading route…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !loadingView && routes.length === 0 && !error && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 p-12 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              No saved routes yet. Plan a route and save it to see it here.
            </p>
          </div>
        )}

        {!loading && !loadingView && routes.length > 0 && (
          <ul className="space-y-4">
            {routes.map((route) => (
              <li
                key={route._id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-sm overflow-hidden"
              >
                <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      {route.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {route.destination ?? "—"} · {route.type === "hike" ? "Trek" : "Bicycle"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Saved {formatDate(route.savedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewRoute(route._id)}
                      className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoute(route._id)}
                      disabled={deletingId === route._id}
                      className="rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-60"
                    >
                      {deletingId === route._id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
