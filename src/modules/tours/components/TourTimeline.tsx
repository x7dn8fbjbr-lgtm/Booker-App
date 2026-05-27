// src/modules/tours/components/TourTimeline.tsx
import Link from "next/link"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { BookingStatus } from "@prisma/client"
import type { Booking, Venue, Project } from "@prisma/client"
import type { ReactNode } from "react"

type BookingInTour = Booking & { venue: Venue; project: Project | null }

const STATUS_COLORS: Record<BookingStatus, string> = {
  ERSTKONTAKT: "border-slate-200 bg-slate-50 text-slate-700",
  IN_VERHANDLUNG: "border-amber-200 bg-amber-50 text-amber-700",
  BESTAETIGT: "border-green-200 bg-green-50 text-green-700",
  ABGESAGT: "border-red-200 bg-red-50 text-red-600 opacity-60",
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  ERSTKONTAKT: "Erstkontakt",
  IN_VERHANDLUNG: "In Verhandlung",
  BESTAETIGT: "Bestätigt",
  ABGESAGT: "Abgesagt",
}

interface Props {
  bookings: BookingInTour[]
  onRemoveForm: (booking: BookingInTour) => ReactNode
}

export function TourTimeline({ bookings, onRemoveForm }: Props) {
  if (bookings.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Noch keine Bookings in dieser Tour.
      </p>
    )
  }

  const byMonth = new Map<string, BookingInTour[]>()
  for (const booking of bookings) {
    const key = format(new Date(booking.date), "yyyy-MM")
    const list = byMonth.get(key) ?? []
    list.push(booking)
    byMonth.set(key, list)
  }

  return (
    <div className="flex flex-col gap-8">
      {Array.from(byMonth.entries()).map(([monthKey, monthBookings]) => (
        <div key={monthKey}>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {format(new Date(`${monthKey}-01`), "MMMM yyyy", { locale: de })}
          </h4>
          <div className="flex flex-col gap-2">
            {monthBookings.map((booking) => (
              <div
                key={booking.id}
                className={cn(
                  "flex items-center gap-4 rounded-md border p-3",
                  STATUS_COLORS[booking.status]
                )}
              >
                <div className="w-20 shrink-0 text-sm font-medium">
                  {format(new Date(booking.date), "EEE d. MMM", { locale: de })}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {booking.venue.name}
                    {booking.venue.city ? ` · ${booking.venue.city}` : ""}
                  </Link>
                  {booking.project && (
                    <p className="text-xs opacity-70">{booking.project.name}</p>
                  )}
                </div>
                <span className="text-xs font-medium shrink-0">
                  {STATUS_LABELS[booking.status]}
                </span>
                {onRemoveForm(booking)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
