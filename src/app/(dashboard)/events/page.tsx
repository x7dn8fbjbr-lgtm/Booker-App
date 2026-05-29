// src/app/(dashboard)/events/page.tsx
import Link from "next/link"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { getEvents } from "@/modules/events/actions/event.actions"

export const metadata = { title: "Events – Booker App" }

export default async function EventsPage() {
  const events = await getEvents()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Events</h2>
        <Link
          href="/events/new"
          className="inline-flex items-center justify-center h-11 sm:h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Event anlegen
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Events angelegt.</p>
      ) : (
        <>
          {/* Mobile: Card Layout */}
          <div className="flex flex-col gap-2 md:hidden">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 active:bg-slate-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-900">{event.name}</span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {event.stages.length} {event.stages.length === 1 ? "Bühne" : "Bühnen"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {format(new Date(event.date), "d. MMM yyyy", { locale: de })}
                  {event.endDate
                    ? ` – ${format(new Date(event.endDate), "d. MMM yyyy", { locale: de })}`
                    : ""}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {event.venue.name}
                  {event.venue.city ? ` · ${event.venue.city}` : ""}
                </p>
              </Link>
            ))}
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden md:block rounded-md border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Datum</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Venue</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Bühnen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/events/${event.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {event.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {format(new Date(event.date), "d. MMM yyyy", { locale: de })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {event.venue.name}
                      {event.venue.city ? ` · ${event.venue.city}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{event.stages.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
