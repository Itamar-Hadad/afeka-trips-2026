"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type User = { id: string; username: string; email?: string } | null;

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const isPublic = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (isPublic) {
      setUser(null);
      setLoading(false);
      return;
    }
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.username ? data : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname, isPublic]);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          Afeka Trips Routes 2026
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors ${
              isActive("/")
                ? "text-sky-600 dark:text-sky-400"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            Home
          </Link>
          <Link
            href="/plan"
            className={`text-sm font-medium transition-colors ${
              isActive("/plan")
                ? "text-sky-600 dark:text-sky-400"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            Route Planning
          </Link>
          <Link
            href="/history"
            className={`text-sm font-medium transition-colors ${
              isActive("/history")
                ? "text-sky-600 dark:text-sky-400"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            Route History
          </Link>
          {!isPublic && (
            <>
              {loading ? (
                <span className="text-sm text-slate-400">…</span>
              ) : user ? (
                <>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {user.username}
                  </span>
                  <Link
                    href="/api/auth/logout"
                    className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400"
                  >
                    Sign out
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Sign in
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
