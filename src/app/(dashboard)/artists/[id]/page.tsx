// src/app/(dashboard)/artists/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getArtistById } from "@/modules/artists/actions/artist.actions"
import { ProjectList } from "@/modules/artists/components/ProjectList"
import { Card, CardContent } from "@/components/ui/Card"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"

const TABS = [
  { label: "Übersicht", value: "uebersicht" },
  { label: "Projekte", value: "projekte" },
  { label: "Bookings", value: "bookings" },
] as const

type Tab = (typeof TABS)[number]["value"]

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const artist = await getArtistById(id)
  return { title: artist ? `${artist.name} – Booker App` : "Artist – Booker App" }
}

export default async function ArtistDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab } = await searchParams

  const artist = await getArtistById(id)
  if (!artist) notFound()

  const activeTab: Tab =
    TABS.some((t) => t.value === tab) ? (tab as Tab) : "uebersicht"

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/artists"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
          >
            ← Artists
          </Link>
          <h2 className="text-xl font-semibold text-slate-900">{artist.name}</h2>
        </div>
        <Link
          href={`/artists/${id}/edit`}
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Bearbeiten
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/artists/${id}?tab=${t.value}`}
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

      {/* Tab Content */}
      {activeTab === "uebersicht" && (
        <Card className="max-w-lg">
          <CardContent className="flex flex-col gap-3 py-5">
            <InfoRow label="E-Mail" value={artist.email} />
            <InfoRow label="Telefon" value={artist.phone} />
            <InfoRow label="Website" value={artist.website} isLink />
          </CardContent>
        </Card>
      )}

      {activeTab === "projekte" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Link
              href={`/artists/${id}/projects/new`}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Projekt anlegen
            </Link>
          </div>
          <ProjectList projects={artist.projects} artistId={id} />
        </div>
      )}

      {activeTab === "bookings" && (
        <EmptyState
          title="Noch keine Bookings"
          description="Bookings werden in Phase 4 implementiert."
        />
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  isLink = false,
}: {
  label: string
  value: string | null | undefined
  isLink?: boolean
}) {
  return (
    <div className="flex gap-4">
      <span className="w-24 flex-shrink-0 text-sm font-medium text-slate-500">
        {label}
      </span>
      {value ? (
        isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:underline truncate"
          >
            {value}
          </a>
        ) : (
          <span className="text-sm text-slate-900">{value}</span>
        )
      ) : (
        <span className="text-sm text-slate-400">—</span>
      )}
    </div>
  )
}
