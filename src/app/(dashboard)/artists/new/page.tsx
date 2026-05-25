// src/app/(dashboard)/artists/new/page.tsx
import { createArtist } from "@/modules/artists/actions/artist.actions"
import { ArtistForm } from "@/modules/artists/components/ArtistForm"

export const metadata = { title: "Artist anlegen – Booker App" }

export default function NewArtistPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Artist anlegen</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Neuen Künstler oder neue Band in die Datenbank aufnehmen.
        </p>
      </div>

      <ArtistForm action={createArtist} cancelHref="/artists" />
    </div>
  )
}
