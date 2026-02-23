"use client";

import { useState } from "react";
import { saveRouteToServer } from "@/lib/routesApi";

type CurrentRoute = {
  destination: string;
  type: string;
  path: number[][];
  pathDays?: number[][][];
};

type SaveRouteProps = {
  currentRoute: CurrentRoute | null;
  onSaved?: () => void;
  className?: string;
};

export default function SaveRoute({
  currentRoute,
  onSaved,
  className = "",
}: SaveRouteProps) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saved, setSaved] = useState(false);

  if (!currentRoute?.destination || !currentRoute?.path?.length) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim()) return;
    setErrorMsg("");
    setIsSaving(true);
    try {
      await saveRouteToServer({
        name: routeName.trim(),
        description: description.trim(),
        destination: currentRoute.destination,
        type: currentRoute.type,
        path: currentRoute.path,
        pathDays: currentRoute.pathDays || [],
      });
      setRouteName("");
      setDescription("");
      setShowSaveForm(false);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to save route."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setRouteName("");
    setDescription("");
    setErrorMsg("");
    setShowSaveForm(false);
  };

  if (saved) {
    return (
      <div
        className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 ${className}`}
      >
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <span aria-hidden>✓</span> Route saved to your history.
        </p>
      </div>
    );
  }

  if (!showSaveForm) {
    return (
      <div
        className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 ${className}`}
      >
        <button
          type="button"
          onClick={() => setShowSaveForm(true)}
          className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
        >
          💾 Save route
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 ${className}`}
    >
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
        Save your route
      </h4>
      <form onSubmit={handleSave} className="space-y-4">
        {errorMsg && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errorMsg}
          </p>
        )}
        <div>
          <label
            htmlFor="route-name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Route name *
          </label>
          <input
            id="route-name"
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            placeholder="e.g. Weekend hike to Tel Aviv"
            required
            disabled={isSaving}
            className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor="route-desc"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Description (optional)
          </label>
          <textarea
            id="route-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes about your route..."
            rows={3}
            disabled={isSaving}
            className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-60 resize-y min-h-[80px]"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !routeName.trim()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save route"}
          </button>
        </div>
      </form>
    </div>
  );
}
