"use client";

import { useEffect, useState } from "react";

//the weather structure for one day
type ForecastDay = {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  precipitation: number | null;
};

//the props for the weather forecast component
type WeatherForecastProps = {
  lat: number;
  lon: number;
  className?: string;
};

export default function WeatherForecast({ lat, lon, className = "" }: WeatherForecastProps) {
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  //i use useEffect to fetch the weather forecast from the backend if the lat or lon changes
  useEffect(() => {
    setError(null);
    setForecast(null);
    const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    if (tz) params.set("tz", tz);
    fetch(`/api/weather-forecast?${params}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Forecast unavailable"); //if the response is not ok, throw an error
        return res.json(); //if the response is ok, return the json
      })
      .then(setForecast) //if the response is ok, set the forecast to the forecast variable
      .catch(() => setError("Could not load weather forecast.")); //if the response is not ok, set the error to the error variable
  }, [lat, lon]);

  //if the error is not null, return a div with the error
  if (error) {
    return (
      <div
        className={`rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200 ${className}`}
      >
        {error}
      </div>
    );
  }

  if (forecast == null) {
    return (
      <div
        className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-500 dark:text-slate-400 ${className}`}
      >
        Loading weather forecast…
      </div>
    );
  }

  if (forecast.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 ${className}`}
    >
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
        3-day forecast (trip starts tomorrow)
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {forecast.map((day, index) => (
          <div
            key={day.date}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm"
          >
            <div className="font-medium text-slate-800 dark:text-slate-100">
              {new Date(day.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="mt-1 text-slate-600 dark:text-slate-300">
              <span aria-hidden>🌡️</span>{" "}
              {day.tempMin != null && day.tempMax != null
                ? `${day.tempMin}°C – ${day.tempMax}°C`
                : "—"}
            </div>
            <div className="mt-0.5 text-slate-600 dark:text-slate-300">
              <span aria-hidden>🌧️</span>{" "}
              {day.precipitation != null ? `${day.precipitation} mm` : "—"} precipitation
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
