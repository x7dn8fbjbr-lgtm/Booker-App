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
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
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
              <td className="px-4 py-3 font-medium text-slate-900">
                {artist.name}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {artist.email ?? "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {artist.phone ?? "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {artist._count.projects}
              </td>
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
  )
}
