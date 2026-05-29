export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 rounded-md bg-slate-200" />
        <div className="h-11 w-32 rounded-md bg-slate-200 sm:h-9" />
      </div>

      {/* Stat cards or list skeletons */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-100" />
        ))}
      </div>

      {/* Content rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  )
}
