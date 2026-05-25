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
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
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
  )
}
