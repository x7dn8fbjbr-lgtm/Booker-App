import { createVenue } from "@/modules/venues/actions/venue.actions"
import { VenueForm } from "@/modules/venues/components/VenueForm"

export const metadata = { title: "Venue anlegen – Booker App" }

export default function NewVenuePage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-slate-900">Venue anlegen</h2>
      <VenueForm action={createVenue} cancelHref="/venues" />
    </div>
  )
}
