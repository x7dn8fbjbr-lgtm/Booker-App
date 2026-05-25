import Link from "next/link"
import { notFound } from "next/navigation"
import { getVenueById } from "@/modules/venues/actions/venue.actions"
import { ContactList } from "@/modules/venues/components/ContactList"
import { Card, CardContent } from "@/components/ui/Card"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"

const VENUE_TYPE_LABELS: Record<string, string> = {
  CLUB: "Club",
  THEATER: "Theater",
  FESTIVAL: "Festival",
  OPEN_AIR: "Open Air",
  SONSTIGE: "Sonstige",
}

const TABS = [
  { label: "Übersicht", value: "uebersicht" },
  { label: "Ansprechpartner", value: "ansprechpartner" },
  { label: "Bookings", value: "bookings" },
] as const

type Tab = (typeof TABS)[number]["value"]

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const venue = await getVenueById(id)
  return { title: venue ? `${venue.name} – Booker App` : "Venue – Booker App" }
}

export default async function VenueDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab } = await searchParams

  const venue = await getVenueById(id)
  if (!venue) notFound()

  const activeTab: Tab =
    TABS.some((t) => t.value === tab) ? (tab as Tab) : "uebersicht"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/venues"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
          >
            ← Venues
          </Link>
          <h2 className="text-xl font-semibold text-slate-900">{venue.name}</h2>
        </div>
        <Link
          href={`/venues/${id}/edit`}
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Bearbeiten
        </Link>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/venues/${id}?tab=${t.value}`}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === t.value
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {activeTab === "uebersicht" && (
        <Card className="max-w-lg">
          <CardContent className="flex flex-col gap-3 py-5">
            <InfoRow label="Stadt" value={venue.city} />
            <InfoRow label="Straße" value={venue.street} />
            <InfoRow label="PLZ" value={venue.zip} />
            <InfoRow label="Typ" value={VENUE_TYPE_LABELS[venue.type] ?? venue.type} />
            <InfoRow
              label="Kapazität"
              value={venue.capacity ? venue.capacity.toLocaleString("de-DE") : null}
            />
            <InfoRow
              label="Bühne (m²)"
              value={venue.stageSizeM2 !== null ? String(venue.stageSizeM2) : null}
            />
            <InfoRow
              label="Genres"
              value={venue.genreTags.length > 0 ? venue.genreTags.join(", ") : null}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === "ansprechpartner" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Link
              href={`/venues/${id}/contacts/new`}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Ansprechpartner hinzufügen
            </Link>
          </div>
          <ContactList contacts={venue.contacts} venueId={id} />
        </div>
      )}

      {activeTab === "bookings" && (
        <EmptyState
          title="Noch keine Bookings"
          description="Bookings werden in Phase 3 implementiert."
        />
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex gap-4">
      <span className="w-28 flex-shrink-0 text-sm font-medium text-slate-500">
        {label}
      </span>
      {value ? (
        <span className="text-sm text-slate-900">{value}</span>
      ) : (
        <span className="text-sm text-slate-400">—</span>
      )}
    </div>
  )
}
