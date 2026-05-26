import Link from "next/link"
import { db } from "@/lib/db"
import { createBooking, getProjectsByArtist } from "@/modules/bookings/actions/booking.actions"
import { BookingForm } from "@/modules/bookings/components/BookingForm"

export const metadata = { title: "Booking anlegen – Booker App" }

interface Props {
  searchParams: Promise<{ artistId?: string; venueId?: string }>
}

export default async function NewBookingPage({ searchParams }: Props) {
  const { artistId, venueId } = await searchParams

  const [artists, venues, initialProjects] = await Promise.all([
    db.artist.findMany({ orderBy: { name: "asc" } }),
    db.venue.findMany({ orderBy: { name: "asc" } }),
    artistId ? getProjectsByArtist(artistId) : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/bookings"
          className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
        >
          ← Bookings
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Booking anlegen</h2>
      </div>

      <BookingForm
        action={createBooking}
        artists={artists}
        venues={venues}
        defaultValues={{ artistId, venueId }}
        initialProjects={initialProjects}
      />
    </div>
  )
}
