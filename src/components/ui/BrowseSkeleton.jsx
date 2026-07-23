/**
 * Schelet pentru ecranul de răsfoire, afișat cât se descarcă playlist-ul.
 * Reproduce structura reală (chips → hero → căutare → grilă) ca trecerea la
 * conținut să nu miște layout-ul.
 */
export default function BrowseSkeleton() {
  return (
    <div className="min-h-screen animate-pulse" aria-hidden>
      {/* bara de sus */}
      <div className="flex items-center gap-4 border-b border-edge bg-elev/85 px-8 py-4 md:px-12 lg:px-16">
        <div className="h-9 w-9 rounded-lg bg-accent/40" />
        <div className="h-6 w-28 rounded bg-card" />
        <div className="ml-auto h-10 w-10 rounded-full bg-card" />
      </div>

      {/* chips */}
      <div className="flex gap-2 overflow-hidden px-8 py-4 md:px-12 lg:px-16">
        {[64, 88, 72, 96, 80, 68].map((w, i) => (
          <div key={i} className="h-9 shrink-0 rounded-full bg-card" style={{ width: w }} />
        ))}
      </div>

      {/* hero */}
      <div className="mx-8 mt-6 mb-12 h-56 rounded-3xl bg-card md:mx-12 md:h-64 lg:mx-16" />

      {/* căutare */}
      <div className="mx-8 mb-2 h-12 max-w-xl rounded-full bg-card md:mx-12 lg:mx-16" />

      {/* grilă */}
      <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-10 px-8 sm:grid-cols-3 md:grid-cols-4 md:px-12 lg:grid-cols-6 lg:px-16">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 p-2">
            <div className="aspect-video w-full rounded-lg bg-card ring-1 ring-edge" />
            <div className="h-3.5 w-3/4 rounded bg-card" />
          </div>
        ))}
      </div>
    </div>
  )
}
