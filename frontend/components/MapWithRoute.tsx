"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";

function toLatLng(coord: number[]): LatLngTuple {
  if (coord.length >= 2) return [coord[1], coord[0]];
  return [0, 0];
}

function toLatLngPositions(dayRoute: number[][]): LatLngTuple[] {
  return dayRoute
    .filter((c) => Array.isArray(c) && c.length >= 2)
    .map((c) => toLatLng(c));
}

function FitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 2) return;
    const lats = positions.map((p) => p[0]);
    const lngs = positions.map((p) => p[1]);
    const southWest: LatLngTuple = [Math.min(...lats), Math.min(...lngs)];
    const northEast: LatLngTuple = [Math.max(...lats), Math.max(...lngs)];
    map.fitBounds([southWest, northEast], { padding: [24, 24], maxZoom: 14 });
  }, [map, positions]);
  return null;
}

const DAY_COLORS = ["#2563eb", "#ea580c", "#16a34a"];

type MapWithRouteProps = {
  path: number[][];
  pathDays: number[][][];
  selectedIndex?: number | null;
  className?: string;
};

export default function MapWithRoute({
  path,
  pathDays,
  selectedIndex = null,
  className = "",
}: MapWithRouteProps) {
  const segments = useMemo(() => {
    const list = pathDays?.length ? pathDays : path?.length ? [path] : [];
    return list.map((dayRoute) => toLatLngPositions(dayRoute)).filter((arr) => arr.length >= 2);
  }, [path, pathDays]);

  const allPositions = useMemo(() => segments.flat(), [segments]);

  const center: LatLngTuple = useMemo(() => {
    if (allPositions.length === 0) return [32.0853, 34.7818];
    const lats = allPositions.map((p) => p[0]);
    const lngs = allPositions.map((p) => p[1]);
    return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
  }, [allPositions]);

  if (segments.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ${className}`}
        style={{ minHeight: 420 }}
      >
        <p className="text-sm">No route to display</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl map-zoom-below-header ${className}`} style={{ minHeight: 420 }}>
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: "100%", minHeight: 420, width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {segments.map((positions, index) => {
          const isHighlighted = selectedIndex === index;
          const color = DAY_COLORS[index % DAY_COLORS.length];
          return (
            <Polyline
              key={index}
              positions={positions}
              pathOptions={{
                color,
                weight: isHighlighted ? 6 : 4,
                opacity: isHighlighted ? 1 : selectedIndex !== null ? 0.3 : 0.9,
              }}
            />
          );
        })}
        <FitBounds positions={allPositions} />
      </MapContainer>
    </div>
  );
}
