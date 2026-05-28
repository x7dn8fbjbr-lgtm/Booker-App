import Link from "next/link"
import { getBookings } from "@/modules/bookings/actions/booking.actions"
import { KanbanBoard } from "@/modules/bookings/components/KanbanBoard"

export const metadata = { title: "Bookings – Booker App" }

export default async function BookingsPage() {
  const bookings = await getBookings()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Bookings</h2>
        <Link
          href="/bookings/new"
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Booking anlegen
        </Link>
      </div>

      <KanbanBoard initialBookings={bookings} />
    </div>
  )
}
