// src/app/(dashboard)/tours/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
  getTourById,
  getAvailableBookingsForTour,
  addBookingToTour,
  removeBookingFromTour,
} from "@/modules/tours/actions/tour.actions"
import { TourTimeline } from "@/modules/tours/components/TourTimeline"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const tour = await getTourById(id)
  return { title: tour ? `${tour.name} – Booker App` : "Tour – Booker App" }
}

export default async function TourDetailPage({ params }: Props) {
  const { id } = await params
  const tour = await getTourById(id)
  if (!tour) notFound()

  const availableBookings = await getAvailableBookingsForTour(tour.artistId)

  async function removeAction(formData: FormData) {
    "use server"
    const bookingId = formData.get("bookingId") as string
    if (!bookingId) return
    await removeBookingFromTour(id, bookingId)
  }

  async function addAction(formData: FormData) {
    "use server"
    const bookingId = formData.get("bookingId") as string
    if (!bookingId) return
    await addBookingToTour(id, bookingId)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/tours" className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
            ← Touren
          </Link>
          <h2 className="text-xl font-semibold text-slate-900">{tour.name}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {tour.artist.name} ·{" "}
            {format(new Date(tour.startDate), "d. MMM yyyy", { locale: de })}
            {" – "}
            {format(new Date(tour.endDate), "d. MMM yyyy", { locale: de })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/tours/${id}/ical`}
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            iCal exportieren
          </a>
          <Link
            href={`/tours/${id}/edit`}
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Bearbeiten
          </Link>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Dates ({tour.bookings.length})
        </h3>
        <TourTimeline
          bookings={tour.bookings}
          onRemoveForm={(booking) => (
            <form action={removeAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <button
                type="submit"
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Entfernen
              </button>
            </form>
          )}
        />
      </div>

      {/* Booking hinzufügen */}
      {availableBookings.length > 0 && (
        <div className="rounded-md border border-slate-200 p-4 max-w-lg">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Booking hinzufügen</h3>
          <form action={addAction} className="flex gap-3">
            <select
              name="bookingId"
              className="flex-1 h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Booking wählen…</option>
              {availableBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {format(new Date(b.date), "d. MMM yyyy", { locale: de })} – {b.venue.name}
                  {b.venue.city ? ` (${b.venue.city})` : ""}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 px-4 rounded-md bg-indigo-600 text-sm text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Hinzufügen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
