import Link from "next/link"
import { getVenues } from "@/modules/venues/actions/venue.actions"
import { VenueTable } from "@/modules/venues/components/VenueTable"

export const metadata = { title: "Venues – Booker App" }

export default async function VenuesPage() {
  const venues = await getVenues()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Venues</h2>
        <div className="flex gap-2">
          <Link
            href="/venues/import"
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            CSV importieren
          </Link>
          <Link
            href="/venues/new"
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Venue anlegen
          </Link>
        </div>
      </div>
      <VenueTable venues={venues} />
    </div>
  )
}
