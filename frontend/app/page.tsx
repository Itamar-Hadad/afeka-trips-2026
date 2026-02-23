import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="max-w-5xl mx-auto px-5 py-14">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 p-8 md:p-10 text-white shadow-lg">
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome back
            </h2>
            <p className="mt-3 max-w-xl text-sky-100 text-base md:text-lg leading-relaxed">
              Plan your perfect adventure with intelligent route generation.
              Choose hiking loop trails or multi-day city-to-city cycling routes.
            </p>
          </div>
          <div
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10"
            aria-hidden
          />
        </section>

        {/* Cards */}
        <section className="mt-12 grid gap-6 sm:grid-cols-2">
          <Link
            href="/plan"
            className="group relative block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-7 shadow-sm transition-all duration-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 dark:hover:border-sky-500/50 dark:hover:shadow-sky-500/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/50 text-2xl transition-transform group-hover:scale-105">
              🗺️
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">
              Route Planning
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Generate personalized routes for hiking or biking. Loop trails for
              trekking or multi-day routes for cycling.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 group-hover:gap-2.5 transition-all">
              Create route
              <span aria-hidden>→</span>
            </span>
          </Link>

          <Link
            href="/history"
            className="group relative block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-7 shadow-sm transition-all duration-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 dark:hover:border-sky-500/50 dark:hover:shadow-sky-500/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/50 text-2xl transition-transform group-hover:scale-105">
              📚
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">
              Route History
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              View and manage your saved routes. Maps, weather, and details for
              all your adventures.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 group-hover:gap-2.5 transition-all">
              View history
              <span aria-hidden>→</span>
            </span>
          </Link>
        </section>

        {/* Short feature line */}
        <p className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Weather forecasts · Interactive maps · Save & share routes
        </p>
      </main>
    </div>
  );
}
