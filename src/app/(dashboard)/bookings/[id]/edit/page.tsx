// src/app/(dashboard)/bookings/[id]/edit/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { db } from "@/lib/db"
import {
  getBookingById,
  updateBooking,
  deleteBooking,
  getProjectsByArtist,
} from "@/modules/bookings/actions/booking.actions"
import { BookingForm } from "@/modules/bookings/components/BookingForm"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const booking = await getBookingById(id)
  if (!booking) return { title: "Booking bearbeiten – Booker App" }
  return { title: `${booking.artist.name} bearbeiten – Booker App` }
}

export default async function EditBookingPage({ params }: Props) {
  const { id } = await params

  const booking = await getBookingById(id)
  if (!booking) notFound()

  const [artists, venues, initialProjects] = await Promise.all([
    db.artist.findMany({ orderBy: { name: "asc" } }),
    db.venue.findMany({ orderBy: { name: "asc" } }),
    getProjectsByArtist(booking.artistId),
  ])

  const boundUpdate = updateBooking.bind(null, id)
  const boundDelete = deleteBooking.bind(null, id)

  const dateStr = format(new Date(booking.date), "yyyy-MM-dd")
  const timeStr = format(new Date(booking.date), "HH:mm")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/bookings/${id}`}
          className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
        >
          ← Booking
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Booking bearbeiten</h2>
      </div>

      <BookingForm
        action={boundUpdate}
        artists={artists}
        venues={venues}
        defaultValues={{
          artistId: booking.artistId,
          projectId: booking.projectId ?? undefined,
          venueId: booking.venueId,
          date: dateStr,
          time: timeStr,
          status: booking.status,
          contactPerson: booking.contactPerson ?? undefined,
        }}
        initialProjects={initialProjects}
        deleteAction={boundDelete}
      />
    </div>
  )
}
