// src/app/(dashboard)/events/new/page.tsx
import Link from "next/link"
import { db } from "@/lib/db"
import { createEvent } from "@/modules/events/actions/event.actions"
import { EventForm } from "@/modules/events/components/EventForm"

export const metadata = { title: "Event anlegen – Booker App" }

export default async function NewEventPage() {
  const venues = await db.venue.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/events" className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
          ← Events
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Event anlegen</h2>
      </div>
      <EventForm action={createEvent} venues={venues} showStages={true} />
    </div>
  )
}
