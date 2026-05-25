// src/app/(dashboard)/artists/[id]/edit/page.tsx
import { notFound } from "next/navigation"
import {
  getArtistById,
  updateArtist,
  deleteArtist,
} from "@/modules/artists/actions/artist.actions"
import { ArtistForm } from "@/modules/artists/components/ArtistForm"
import { Button } from "@/components/ui/Button"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Artist bearbeiten – Booker App" }

export default async function EditArtistPage({ params }: Props) {
  const { id } = await params
  const artist = await getArtistById(id)
  if (!artist) notFound()

  const updateArtistWithId = updateArtist.bind(null, id)
  const deleteArtistWithId = deleteArtist.bind(null, id) as () => Promise<void>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Artist bearbeiten
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{artist.name}</p>
      </div>

      <ArtistForm
        action={updateArtistWithId}
        defaultValues={artist}
        cancelHref={`/artists/${id}`}
      />

      {/* Gefahrenzone */}
      <div className="border border-red-200 rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-red-700 mb-1">
          Artist löschen
        </h3>
        <p className="text-sm text-red-600 mb-3">
          Löscht den Artist und alle zugehörigen Projekte dauerhaft.
        </p>
        <form action={deleteArtistWithId}>
          <Button type="submit" variant="danger" size="sm">
            Artist löschen
          </Button>
        </form>
      </div>
    </div>
  )
}
