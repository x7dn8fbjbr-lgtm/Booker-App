// src/modules/artists/components/ArtistTable.tsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/shared/EmptyState"
import type { Artist } from "@prisma/client"

type ArtistWithCount = Artist & { _count: { projects: number } }

interface ArtistTableProps {
  artists: ArtistWithCount[]
}

export function ArtistTable({ artists }: ArtistTableProps) {
  const router = useRouter()

  if (artists.length === 0) {
    return (
      <EmptyState
        title="Noch keine Artists"
        description="Lege deinen ersten Artist an, um loszulegen."
        action={
          <Button onClick={() => router.push("/artists/new")}>
            Artist anlegen
          </Button>
        }
      />
    )
  }

  return (
    <>
      {/* Mobile: Card Layout */}
      <div className="flex flex-col gap-2 md:hidden">
        {artists.map((artist) => (
          <button
            key={artist.id}
            onClick={() => router.push(`/artists/${artist.id}`)}
            className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-slate-900">{artist.name}</span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {artist._count.projects} {artist._count.projects === 1 ? "Projekt" : "Projekte"}
              </span>
            </div>
            {artist.email && (
              <p className="mt-1 text-sm text-slate-500 truncate">{artist.email}</p>
            )}
            {artist.phone && (
              <p className="mt-0.5 text-sm text-slate-500">{artist.phone}</p>
            )}
          </button>
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">E-Mail</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Telefon</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Projekte</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Angelegt</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((artist) => (
              <tr
                key={artist.id}
                className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => router.push(`/artists/${artist.id}`)}
              >
                <td className="px-4 py-3 font-medium text-slate-900">{artist.name}</td>
                <td className="px-4 py-3 text-slate-600">{artist.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{artist.phone ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{artist._count.projects}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(artist.createdAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
