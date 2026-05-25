import { notFound } from "next/navigation"
import {
  getVenueById,
  updateVenue,
  deleteVenue,
} from "@/modules/venues/actions/venue.actions"
import { VenueForm } from "@/modules/venues/components/VenueForm"
import { Button } from "@/components/ui/Button"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Venue bearbeiten – Booker App" }

export default async function EditVenuePage({ params }: Props) {
  const { id } = await params
  const venue = await getVenueById(id)
  if (!venue) notFound()

  const updateVenueWithId = updateVenue.bind(null, id)
  const deleteVenueWithId = deleteVenue.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Venue bearbeiten</h2>
        <p className="mt-0.5 text-sm text-slate-500">{venue.name}</p>
      </div>

      <VenueForm
        action={updateVenueWithId}
        defaultValues={venue}
        cancelHref={`/venues/${id}`}
      />

      <div className="border border-red-200 rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-red-700 mb-1">Venue löschen</h3>
        <p className="text-sm text-red-600 mb-3">
          Löscht die Venue und alle zugehörigen Ansprechpartner dauerhaft.
        </p>
        <form action={deleteVenueWithId}>
          <Button type="submit" variant="danger" size="sm">
            Venue löschen
          </Button>
        </form>
      </div>
    </div>
  )
}
