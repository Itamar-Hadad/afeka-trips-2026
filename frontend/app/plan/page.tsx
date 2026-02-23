"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { calculateRouteDistanceKm } from "@/lib/geo-utils";
import WeatherForecast from "@/components/WeatherForecast";
import DestinationImage from "@/components/DestinationImage";
import RouteEnrichment from "@/components/RouteEnrichment";
import SaveRoute from "@/components/SaveRoute";

const MapWithRoute = dynamic(() => import("@/components/MapWithRoute"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[280px] text-slate-500 dark:text-slate-400 text-sm">
      Loading map…
    </div>
  ),
});

type TripType = "hike" | "bike";

const DAY_COLORS = ["#2563eb", "#ea580c", "#16a34a"];

export default function RoutePlanningPage() {
  const [destination, setDestination] = useState("");
  const [type, setType] = useState<TripType | "">("");
  const [days, setDays] = useState<2 | 3>(2);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    destination: string;
    type: string;
    path: number[][];
    pathDays: number[][][];
  } | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [hoveredRouteIndex, setHoveredRouteIndex] = useState<number | null>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!destination.trim()) {
      setError("Please enter a destination (country, region, or city).");
      return;
    }
    if (!type) {
      setError("Please select trip type: Trek or Bicycle.");
      return;
    }
    if (type === "bike" && (days < 2 || days > 3)) {
      setError("For bicycle trips, duration must be 2 or 3 days.");
      return;
    }

    setIsLoading(true);
    try {
      const body: { destination: string; type: string; days?: number } = {
        destination: destination.trim(),
        type,
      };
      if (type === "bike") body.days = days;

      const res = await fetch("/api/generate-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to generate route.");
        return;
      }

      setResult({
        destination: data.destination,
        type: data.type,
        path: data.path ?? [],
        pathDays: data.pathDays ?? [],
      });
      setSelectedRouteIndex(null);
      setHoveredRouteIndex(null);
    } catch {
      setError("Failed to generate route. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const optionCount = result?.pathDays?.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Plan your adventure
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Generate personalized routes for your next hiking or biking adventure
          </p>
        </header>

        {/* Two columns: form | result */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
          {/* Left: form card */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 md:p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  Create new route
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Fill in the details below to generate your route
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 px-4 py-3 text-sm text-red-800 dark:text-red-200"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="destination"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Destination
                  </label>
                  <input
                    id="destination"
                    type="text"
                    placeholder="e.g. Paris, France or Alps"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    disabled={isLoading}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all disabled:opacity-60"
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Trip type
                  </span>
                  <div className="grid grid-cols-1 gap-3">
                    <label
                      className={`relative flex items-center gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        type === "hike"
                          ? "border-sky-500 bg-sky-50/80 dark:bg-sky-900/30 dark:border-sky-500"
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800/50"
                      } ${isLoading ? "pointer-events-none opacity-70" : ""}`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value="hike"
                        checked={type === "hike"}
                        onChange={() => setType("hike")}
                        disabled={isLoading}
                        className="sr-only"
                      />
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-2xl">
                        🏔️
                      </span>
                      <div className="min-w-0">
                        <span className="block font-semibold text-slate-800 dark:text-slate-100">
                          Trek
                        </span>
                        <span className="block text-sm text-slate-500 dark:text-slate-400">
                          Loop trail · 1 day · 1–3 route options (5–10 km)
                        </span>
                      </div>
                    </label>
                    <label
                      className={`relative flex items-center gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        type === "bike"
                          ? "border-sky-500 bg-sky-50/80 dark:bg-sky-900/30 dark:border-sky-500"
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800/50"
                      } ${isLoading ? "pointer-events-none opacity-70" : ""}`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value="bike"
                        checked={type === "bike"}
                        onChange={() => setType("bike")}
                        disabled={isLoading}
                        className="sr-only"
                      />
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-2xl">
                        🚴
                      </span>
                      <div className="min-w-0">
                        <span className="block font-semibold text-slate-800 dark:text-slate-100">
                          Bicycle
                        </span>
                        <span className="block text-sm text-slate-500 dark:text-slate-400">
                          City-to-city · 2 or 3 days · 30–70 km/day
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {type === "bike" && (
                  <div>
                    <label
                      htmlFor="days"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                    >
                      Trip duration
                    </label>
                    <select
                      id="days"
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value) as 2 | 3)}
                      disabled={isLoading}
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all disabled:opacity-60"
                    >
                      <option value={2}>2 days</option>
                      <option value={3}>3 days</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-sky-600 py-3.5 font-semibold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-700 hover:shadow-sky-500/30 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-60 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating route…
                    </>
                  ) : (
                    "Generate route"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right: result / empty / loading */}
          <div className="min-h-[320px] lg:min-h-[480px] flex flex-col">
            {isLoading && (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-none p-8 md:p-12 text-center">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                </span>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Finding the perfect route for you…
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  This may take a few seconds
                </p>
              </div>
            )}

            {!isLoading && result && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-xl">
                    ✓
                  </span>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Route generated
                  </h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-1">
                  {result.type === "hike"
                    ? `${optionCount} route option(s) for ${result.destination} (1 day).`
                    : `${result.destination} — ${result.pathDays?.length ?? 0} day(s).`}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {result.type === "hike"
                    ? "Each color on the map is a different route option."
                    : "Each color on the map is a different day of the trip."}
                </p>
                {result.pathDays && result.pathDays.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-3">
                    {result.pathDays.map((dayRoute, index) => {
                      const km = calculateRouteDistanceKm(dayRoute);
                      const label = result.type === "hike" ? `Option ${index + 1}` : `Day ${index + 1}`;
                      const isSelected = selectedRouteIndex === index;
                      const isHovered = hoveredRouteIndex === index;
                      const color = DAY_COLORS[index % DAY_COLORS.length];
                      const isActive = isSelected || isHovered;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedRouteIndex(isSelected ? null : index)}
                          onMouseEnter={() => setHoveredRouteIndex(index)}
                          onMouseLeave={() => setHoveredRouteIndex(null)}
                          className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all cursor-pointer ${isActive ? "border-2" : "border border-transparent"}`}
                          style={{
                            backgroundColor: isSelected ? color : isHovered ? `${color}40` : "rgb(241 245 249 / 0.8)",
                            color: isSelected ? "white" : undefined,
                            borderColor: isActive ? color : undefined,
                          }}
                        >
                          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                          {label}: {km.toFixed(1)} km
                        </button>
                      );
                    })}
                  </div>
                )}
                <MapWithRoute
                  key={`${result.destination}-${result.type}-${result.pathDays?.length ?? 0}`}
                  path={result.path}
                  pathDays={result.pathDays}
                  selectedIndex={selectedRouteIndex ?? hoveredRouteIndex}
                  className="w-full"
                />
                {result.path?.length > 0 && Array.isArray(result.path[0]) && result.path[0].length >= 2 && (
                  <WeatherForecast
                    lat={result.path[0][1]}
                    lon={result.path[0][0]}
                    className="mt-4 w-full"
                  />
                )}
                <DestinationImage destination={result.destination} className="mt-4 w-full" />

                <RouteEnrichment currentRoute={result} className="mt-4 w-full" />

                <SaveRoute
                  key={result.destination + result.type + (result.path?.length ?? 0)}
                  currentRoute={result}
                  className="mt-6"
                />
              </div>
            )}

            {!isLoading && !result && (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-none p-8 md:p-12 text-center">
                <span className="mb-4 text-5xl opacity-70" aria-hidden>
                  🗺️
                </span>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Ready to explore?
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                  Fill out the form to generate your personalized adventure route
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
