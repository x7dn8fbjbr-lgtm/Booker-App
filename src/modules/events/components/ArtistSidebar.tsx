// src/modules/events/components/ArtistSidebar.tsx
"use client"

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import type { Artist } from "@prisma/client"

interface Props {
  artists: Artist[]
  assignedArtistIds: Set<string>
}

export function ArtistSidebar({ artists, assignedArtistIds }: Props) {
  const [search, setSearch] = useState("")

  const filtered = artists.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-3 w-52 shrink-0 print:hidden">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Artists</p>
      <input
        type="text"
        placeholder="Suchen…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-240px)]">
        {filtered.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            disabled={assignedArtistIds.has(artist.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Keine Artists gefunden</p>
        )}
      </div>
    </div>
  )
}

function ArtistCard({ artist, disabled }: { artist: Artist; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `artist::${artist.id}`,
    data: { artistId: artist.id },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...(disabled ? {} : listeners)}
      className={cn(
        "rounded-md border p-2 text-sm select-none transition-colors",
        disabled
          ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
          : "border-slate-200 bg-white text-slate-900 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300"
      )}
    >
      <p className="font-medium truncate">{artist.name}</p>
      {disabled && <p className="text-xs text-slate-400 mt-0.5">Bereits geplant</p>}
    </div>
  )
}
