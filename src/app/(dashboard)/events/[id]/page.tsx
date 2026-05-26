// src/app/(dashboard)/events/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { db } from "@/lib/db"
import { getEventById } from "@/modules/events/actions/event.actions"
import { FestivalPlanner } from "@/modules/events/components/FestivalPlanner"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const event = await getEventById(id)
  return { title: event ? `${event.name} – Booker App` : "Event – Booker App" }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const [event, artists] = await Promise.all([
    getEventById(id),
    db.artist.findMany({ orderBy: { name: "asc" } }),
  ])
  if (!event) notFound()

  const allSlots = event.stages.flatMap((s) => s.slots)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/events"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
          >
            ← Events
          </Link>
          <h2 className="text-xl font-semibold text-slate-900">{event.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(event.date), "d. MMMM yyyy", { locale: de })}
            {" · "}
            {event.venue.name}
            {event.venue.city ? ` · ${event.venue.city}` : ""}
            {" · "}
            {event.startTime}–{event.endTime}
          </p>
        </div>
        <Link
          href={`/events/${id}/edit`}
          className="h-9 px-4 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Bearbeiten
        </Link>
      </div>

      <FestivalPlanner event={event} artists={artists} initialSlots={allSlots} />
    </div>
  )
}
