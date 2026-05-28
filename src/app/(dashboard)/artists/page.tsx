// src/app/(dashboard)/artists/page.tsx
import Link from "next/link"
import { getArtists } from "@/modules/artists/actions/artist.actions"
import { ArtistTable } from "@/modules/artists/components/ArtistTable"

export const metadata = { title: "Artists – Booker App" }

export default async function ArtistsPage() {
  const artists = await getArtists()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Artists</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {artists.length} {artists.length === 1 ? "Artist" : "Artists"} in der Datenbank
          </p>
        </div>
        <Link
          href="/artists/new"
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Artist anlegen
        </Link>
      </div>

      <ArtistTable artists={artists} />
    </div>
  )
}
