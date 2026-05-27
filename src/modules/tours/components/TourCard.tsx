// src/modules/tours/components/TourCard.tsx
import Link from "next/link"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import type { TourWithRelations } from "../actions/tour.actions"

interface Props {
  tour: TourWithRelations
}

export function TourCard({ tour }: Props) {
  const confirmed = tour.bookings.filter((b) => b.status === "BESTAETIGT").length

  return (
    <Link
      href={`/tours/${tour.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{tour.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{tour.artist.name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          {tour.bookings.length} Dates
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span>
          {format(new Date(tour.startDate), "d. MMM yyyy", { locale: de })}
          {" – "}
          {format(new Date(tour.endDate), "d. MMM yyyy", { locale: de })}
        </span>
        {confirmed > 0 && (
          <span className="text-green-600 font-medium">{confirmed} bestätigt</span>
        )}
      </div>
    </Link>
  )
}
