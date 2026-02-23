"use client";

import { useEffect, useState } from "react";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=500&fit=crop&auto=format";

type DestinationImageProps = {
  destination: string;
  className?: string;
};

type ApiResponse =
  | { url: string }
  | { error?: string; fallback: boolean };

export default function DestinationImage({ destination, className = "" }: DestinationImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const searchTerm =
    destination.trim().split(",")[0].trim() || destination.trim();

  useEffect(() => {
    if (!searchTerm) {
      setImageUrl(FALLBACK_IMG);
      setLoading(false);
      return;
    }

    setLoading(true);
    setImageUrl(null);

    const params = new URLSearchParams({ q: searchTerm });
    fetch(`/api/destination-image?${params}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        if ("url" in data && data.url) {
          setImageUrl(data.url);
        } else {
          setImageUrl(FALLBACK_IMG);
        }
      })
      .catch(() => setImageUrl(FALLBACK_IMG))
      .finally(() => setLoading(false));
  }, [searchTerm]);

  if (loading) {
    return (
      <div
        className={`rounded-xl bg-slate-200 dark:bg-slate-700 min-h-[240px] ${className}`}
        aria-hidden
      />
    );
  }

  const src = imageUrl || FALLBACK_IMG;

  return (
    <img
      src={src}
      alt=""
      className={`w-full h-[240px] object-cover rounded-xl ${className}`}
      loading="lazy"
    />
  );
}
