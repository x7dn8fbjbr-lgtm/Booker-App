// src/app/(dashboard)/bookings/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { BookingStatus } from "@prisma/client"
import { cn } from "@/lib/utils"
import {
  getBookingById,
  updateBookingStatusFormAction,
} from "@/modules/bookings/actions/booking.actions"
import { upsertNegotiation } from "@/modules/bookings/actions/negotiation.actions"
import { createLog } from "@/modules/bookings/actions/log.actions"
import { NegotiationForm } from "@/modules/bookings/components/NegotiationForm"
import { CommunicationLog } from "@/modules/bookings/components/CommunicationLog"
import { LogForm } from "@/modules/bookings/components/LogForm"

const STATUS_LABELS: Record<BookingStatus, string> = {
  ERSTKONTAKT: "Erstkontakt",
  IN_VERHANDLUNG: "In Verhandlung",
  BESTAETIGT: "Bestätigt",
  ABGESAGT: "Abgesagt",
}

const STATUS_BADGE: Record<BookingStatus, string> = {
  ERSTKONTAKT: "bg-slate-100 text-slate-700",
  IN_VERHANDLUNG: "bg-amber-100 text-amber-700",
  BESTAETIGT: "bg-green-100 text-green-700",
  ABGESAGT: "bg-red-100 text-red-700",
}

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [BookingStatus, string][]

const TABS = [
  { label: "Übersicht", value: "uebersicht" },
  { label: "Verhandlung", value: "verhandlung" },
  { label: "Kommunikation", value: "kommunikation" },
] as const

type Tab = (typeof TABS)[number]["value"]

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const booking = await getBookingById(id)
  if (!booking) return { title: "Booking – Booker App" }
  return {
    title: `${booking.artist.name} · ${booking.venue.name} – Booker App`,
  }
}

export default async function BookingDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab } = await searchParams

  let booking
  try {
    booking = await getBookingById(id)
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    return (
      <pre className="p-6 text-xs text-red-700 bg-red-50 overflow-auto whitespace-pre-wrap">
        {msg}
      </pre>
    )
  }
  if (!booking) notFound()

  const activeTab: Tab = TABS.some((t) => t.value === tab)
    ? (tab as Tab)
    : "uebersicht"

  const boundUpsertNegotiation = upsertNegotiation.bind(null, id)
  const boundCreateLog = createLog.bind(null, id)
  const boundUpdateStatusForm = updateBookingStatusFormAction.bind(null, id, null)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/bookings"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
          >
            ← Bookings
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              {booking.artist.name} · {booking.venue.name}
            </h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_BADGE[booking.status]
              )}
            >
              {STATUS_LABELS[booking.status]}
            </span>
          </div>
        </div>
        <Link
          href={`/bookings/${id}/edit`}
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
              href={`/bookings/${id}?tab=${t.value}`}
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

      {/* Tab: Übersicht */}
      {activeTab === "uebersicht" && (
        <div className="flex flex-col gap-6 max-w-lg">
          <div className="flex flex-col gap-3">
            <InfoRow label="Artist" value={booking.artist.name} />
            {booking.project && (
              <InfoRow label="Projekt" value={booking.project.name} badge />
            )}
            <InfoRow
              label="Venue"
              value={
                booking.venue.city
                  ? `${booking.venue.name} (${booking.venue.city})`
                  : booking.venue.name
              }
            />
            <InfoRow
              label="Datum"
              value={format(new Date(booking.date), "d. MMMM yyyy, HH:mm", {
                locale: de,
              })}
            />
            <InfoRow label="Ansprechpartner" value={booking.contactPerson} />
          </div>

          {/* Status change */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-700">Status ändern</p>
            <form action={boundUpdateStatusForm} className="flex gap-3 items-center">
              <select
                name="status"
                defaultValue={booking.status}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md bg-white border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Speichern
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Verhandlung */}
      {activeTab === "verhandlung" && (
        <NegotiationForm
          action={boundUpsertNegotiation}
          negotiation={booking.negotiation}
        />
      )}

      {/* Tab: Kommunikation */}
      {activeTab === "kommunikation" && (
        <div className="flex flex-col gap-6">
          <CommunicationLog bookingId={id} logs={booking.communications} />
          <LogForm action={boundCreateLog} />
        </div>
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  badge = false,
}: {
  label: string
  value: string | null | undefined
  badge?: boolean
}) {
  return (
    <div className="flex gap-4">
      <span className="w-32 flex-shrink-0 text-sm font-medium text-slate-500">
        {label}
      </span>
      {value ? (
        badge ? (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {value}
          </span>
        ) : (
          <span className="text-sm text-slate-900">{value}</span>
        )
      ) : (
        <span className="text-sm text-slate-400">—</span>
      )}
    </div>
  )
}
