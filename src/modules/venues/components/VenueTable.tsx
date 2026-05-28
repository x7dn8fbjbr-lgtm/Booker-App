"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/shared/EmptyState"
import type { Venue } from "@prisma/client"

type VenueWithCount = Venue & { _count: { contacts: number } }

const VENUE_TYPE_LABELS: Record<string, string> = {
  CLUB: "Club",
  THEATER: "Theater",
  FESTIVAL: "Festival",
  OPEN_AIR: "Open Air",
  SONSTIGE: "Sonstige",
}

interface VenueTableProps {
  venues: VenueWithCount[]
}

export function VenueTable({ venues }: VenueTableProps) {
  const router = useRouter()

  if (venues.length === 0) {
    return (
      <EmptyState
        title="Noch keine Venues"
        description="Lege deine erste Venue an oder importiere eine CSV-Datei."
        action={
          <Button onClick={() => router.push("/venues/new")}>
            Venue anlegen
          </Button>
        }
      />
    )
  }

  return (
    <>
      {/* Mobile: Card Layout */}
      <div className="flex flex-col gap-2 md:hidden">
        {venues.map((venue) => (
          <button
            key={venue.id}
            onClick={() => router.push(`/venues/${venue.id}`)}
            className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-slate-900">{venue.name}</span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
              </span>
            </div>
            {venue.city && (
              <p className="mt-1 text-sm text-slate-500">{venue.city}</p>
            )}
            <div className="mt-1 flex gap-3 text-xs text-slate-400">
              {venue.capacity && (
                <span>{venue.capacity.toLocaleString("de-DE")} Plätze</span>
              )}
              <span>{venue._count.contacts} {venue._count.contacts === 1 ? "Kontakt" : "Kontakte"}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Stadt</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Typ</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Kapazität</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Ansprechpartner</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((venue) => (
              <tr
                key={venue.id}
                className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => router.push(`/venues/${venue.id}`)}
              >
                <td className="px-4 py-3 font-medium text-slate-900">{venue.name}</td>
                <td className="px-4 py-3 text-slate-600">{venue.city ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {venue.capacity ? venue.capacity.toLocaleString("de-DE") : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{venue._count.contacts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
